using System.Data;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.DTOs;
using VecinApp.Models;
using VecinApp.Services;

namespace VecinApp.Controllers;

[ApiController]
[Route("api/vinculaciones")]
[Authorize(Roles = "Propietario,Inquilino")]
public sealed class VinculacionesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<Usuario> _users;
    private readonly VinculacionesService _vinculaciones;
    private readonly NotificacionesService _notifications;

    public VinculacionesController(AppDbContext db, UserManager<Usuario> users,
        VinculacionesService vinculaciones, NotificacionesService notifications)
    {
        _db = db;
        _users = users;
        _vinculaciones = vinculaciones;
        _notifications = notifications;
    }

    [HttpGet("solicitudes")]
    public async Task<IActionResult> Solicitudes([FromQuery] int? id, CancellationToken ct)
    {
        var actual = await UsuarioActivoAsync(ct);
        if (actual.Result != null) return actual.Result;
        IQueryable<SolicitudVinculacion> query = _db.SolicitudesVinculacion.AsNoTracking()
            .Where(s => (s.IdPropietario == actual.Value!.Id || s.IdInquilino == actual.Value.Id) &&
                s.Unidad.IdEdificio == actual.Value.IdEdificio &&
                s.Propietario.IdEdificio == actual.Value.IdEdificio && s.Inquilino.IdEdificio == actual.Value.IdEdificio)
            .Include(s => s.Propietario).Include(s => s.Inquilino).Include(s => s.Unidad)
            .Include(s => s.DeclaracionPropietario).Include(s => s.DeclaracionInquilino);
        if (id.HasValue) query = query.Where(s => s.IdSolicitudVinculacion == id.Value);
        var items = await query.OrderByDescending(s => s.FechaCreacion).Take(id.HasValue ? 1 : 50).ToListAsync(ct);
        if (id.HasValue && items.Count == 0) return NotFound(new { message = "No se encontró la solicitud." });
        return Ok(items.Select(item => Map(item, actual.Value!.Id)));
    }

    [HttpPost("solicitudes/{id:int}/respuesta")]
    public async Task<IActionResult> Responder(int id, [FromBody] ResponderVinculacionRequest request, CancellationToken ct)
    {
        if (!request.Acepta.HasValue) return BadRequest(new { message = "Indicá si aceptás o rechazás la solicitud." });
        var acepta = request.Acepta.Value;
        var actual = await UsuarioActivoAsync(ct);
        if (actual.Result != null) return actual.Result;
        var usuario = actual.Value!;
        var esPropietario = User.IsInRole("Propietario");
        await using var tx = _db.Database.IsRelational()
            ? await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct)
            : null;

        var solicitud = await _db.SolicitudesVinculacion.FirstOrDefaultAsync(s => s.IdSolicitudVinculacion == id &&
            (esPropietario ? s.IdPropietario == usuario.Id : s.IdInquilino == usuario.Id) && s.Estado == "Pendiente" &&
            s.Unidad.IdEdificio == usuario.IdEdificio, ct);
        if (solicitud == null) return Conflict(new { message = "La solicitud ya fue respondida o no está disponible para tu cuenta." });
        var otroId = esPropietario ? solicitud.IdInquilino : solicitud.IdPropietario;
        var otroRol = esPropietario ? "Inquilino" : "Propietario";
        var otraParteActiva = await _db.Users.Include(u => u.Rol).AnyAsync(u => u.Id == otroId &&
            u.Estado == EstadoUsuario.Activo && u.IdEdificio == usuario.IdEdificio && u.Rol != null && u.Rol.Nombre == otroRol, ct);
        if (!otraParteActiva) return Conflict(new { message = "La otra cuenta ya no está activa en el edificio de la solicitud." });
        var ahora = DateTime.UtcNow;
        if (acepta)
        {
            if (esPropietario)
            {
                if (solicitud.PropietarioAcepto) return Conflict(new { message = "Ya respondiste esta solicitud." });
                solicitud.PropietarioAcepto = true;
                solicitud.FechaRespuestaPropietario = ahora;
            }
            else
            {
                if (solicitud.InquilinoAcepto) return Conflict(new { message = "Ya respondiste esta solicitud." });
                solicitud.InquilinoAcepto = true;
                solicitud.FechaRespuestaInquilino = ahora;
            }
        }
        else
        {
            solicitud.Estado = "Rechazada";
            solicitud.IdUsuarioRechazo = usuario.Id;
            solicitud.MotivoRechazo = string.IsNullOrWhiteSpace(request.Motivo) ? null : request.Motivo.Trim();
            solicitud.FechaRechazo = ahora;
            if (esPropietario) solicitud.FechaRespuestaPropietario = ahora;
            else solicitud.FechaRespuestaInquilino = ahora;
        }
        solicitud.Version++;
        try { await _db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { return Conflict(new { message = "La solicitud cambió mientras respondías. Actualizá el perfil y volvé a intentarlo." }); }

        await _db.Entry(solicitud).Reference(s => s.Unidad).LoadAsync(ct);
        if (!acepta)
        {
            var otro = esPropietario ? solicitud.IdInquilino : solicitud.IdPropietario;
            await _notifications.CrearParaUsuariosAsync(new[] { otro }, "Vinculacion",
                "La solicitud de vinculación fue rechazada y enviada a Administración para revisión.",
                "Vinculación pendiente de revisión", $"/perfil?solicitudVinculacionId={id}");
            await _notifications.NotificarAAdministradoresAsync(solicitud.Unidad.IdEdificio, "Vinculacion",
                $"Se rechazó una solicitud de vinculación para la unidad {solicitud.Unidad.Piso} / {solicitud.Unidad.Identificacion}. El caso quedó pendiente de revisión.",
                "Desacuerdo en una vinculación", "/admin-dashboard");
            if (tx != null) await tx.CommitAsync(ct);
            return Ok(new { estado = "Rechazada", mensaje = "Se notificó a la Administración sobre el desacuerdo en esta vinculación. El caso quedó pendiente de revisión" });
        }

        var vigente = solicitud;
        if (vigente.PropietarioAcepto && vigente.InquilinoAcepto)
        {
            var participantes = await _db.Users.Include(u => u.Rol)
                .Where(u => (u.Id == vigente.IdPropietario || u.Id == vigente.IdInquilino) && u.Estado == EstadoUsuario.Activo && u.IdEdificio == usuario.IdEdificio)
                .ToListAsync(ct);
            var propietario = participantes.SingleOrDefault(u => u.Id == vigente.IdPropietario && u.Rol!.Nombre == "Propietario");
            var inquilino = participantes.SingleOrDefault(u => u.Id == vigente.IdInquilino && u.Rol!.Nombre == "Inquilino");
            var unidad = await _db.Unidades.FirstOrDefaultAsync(u => u.IdUnidad == vigente.IdUnidad && u.IdEdificio == usuario.IdEdificio, ct);
            if (propietario == null || inquilino == null || unidad == null)
                return Conflict(new { message = "No se pudieron validar las cuentas y la unidad de la solicitud." });

            if (!await _db.UsuariosUnidades.AnyAsync(r => r.IdUsuario == propietario.Id && r.IdUnidad == unidad.IdUnidad && r.TipoRelacion == "Propietario", ct))
                _db.UsuariosUnidades.Add(new UsuarioUnidad { IdUsuario = propietario.Id, IdUnidad = unidad.IdUnidad, TipoRelacion = "Propietario" });
            if (!await _db.UsuariosUnidades.AnyAsync(r => r.IdUsuario == inquilino.Id && r.IdUnidad == unidad.IdUnidad && r.TipoRelacion == "Inquilino", ct))
                _db.UsuariosUnidades.Add(new UsuarioUnidad { IdUsuario = inquilino.Id, IdUnidad = unidad.IdUnidad, TipoRelacion = "Inquilino" });
            vigente.Estado = "Confirmada";
            vigente.FechaConfirmacion = DateTime.UtcNow;
            vigente.Version++;
            await _db.SaveChangesAsync(ct);
            await _notifications.CrearParaUsuariosAsync(new[] { propietario.Id, inquilino.Id }, "Vinculacion",
                $"La vinculación para la unidad {unidad.Piso} / {unidad.Identificacion} fue confirmada por ambas partes.",
                "Vinculación confirmada", "/perfil");
            if (tx != null) await tx.CommitAsync(ct);
            return Ok(new { estado = "Confirmada", mensaje = "La vinculación quedó confirmada." });
        }

        var otroParticipante = esPropietario ? solicitud.IdInquilino : solicitud.IdPropietario;
        await _notifications.CrearParaUsuariosAsync(new[] { otroParticipante }, "Vinculacion",
            "La otra parte aceptó la solicitud. Revisá tu perfil para confirmar la vinculación.",
            "Falta tu confirmación", $"/perfil?solicitudVinculacionId={id}");
        if (tx != null) await tx.CommitAsync(ct);
        return Ok(new { estado = "Pendiente", mensaje = "Tu aceptación quedó registrada. Falta la respuesta de la otra parte." });
    }

    [HttpPut("declaraciones")]
    public async Task<IActionResult> ActualizarDeclaracion([FromBody] DeclaracionVinculacionRequest request, CancellationToken ct)
    {
        var actual = await UsuarioActivoAsync(ct);
        if (actual.Result != null) return actual.Result;
        var usuario = actual.Value!;
        var esPropietario = User.IsInRole("Propietario");
        var tipoPermitido = esPropietario ? request.Tipo is "Titularidad" or "Residencia" : request.Tipo == "Ocupacion";
        if (!tipoPermitido || (request.Tipo == "Titularidad" && request.EstaAlquilada != true))
            return BadRequest(new { message = "El tipo de declaración no corresponde a tu perfil." });

        var piso = NormalizarUnidad(request.Piso);
        var identificacion = NormalizarUnidad(request.Identificacion);
        var unidades = await _db.Unidades.AsNoTracking().Where(u => u.IdEdificio == usuario.IdEdificio).ToListAsync(ct);
        var coincidencias = unidades.Where(u => NormalizarUnidad(u.Piso) == piso && NormalizarUnidad(u.Identificacion) == identificacion).ToList();
        if (coincidencias.Count != 1) return BadRequest(new { message = coincidencias.Count == 0
            ? "La unidad debe coincidir con una unidad registrada en tu edificio."
            : "La unidad declarada coincide con más de una unidad. Contactá a la Administración." });
        var unidad = coincidencias[0];

        DeclaracionUnidadComunitaria declaracion;
        if (request.IdDeclaracion.HasValue)
        {
            declaracion = await _db.DeclaracionesUnidadesComunitarias.FirstOrDefaultAsync(d =>
                d.IdDeclaracionUnidad == request.IdDeclaracion && d.IdUsuario == usuario.Id && d.IdEdificio == usuario.IdEdificio, ct)
                ?? null!;
            if (declaracion == null) return NotFound(new { message = "La declaración no pertenece a tu cuenta." });
            var confirmada = await _db.SolicitudesVinculacion.AnyAsync(s => s.Estado == "Confirmada" &&
                (s.IdDeclaracionPropietario == declaracion.IdDeclaracionUnidad || s.IdDeclaracionInquilino == declaracion.IdDeclaracionUnidad), ct);
            if (confirmada && (declaracion.Tipo != request.Tipo || declaracion.IdUnidad != unidad.IdUnidad))
                return Conflict(new { message = "No se puede cambiar la unidad o el tipo de una relación ya confirmada." });
        }

        else
        {
            declaracion = new DeclaracionUnidadComunitaria
            {
                IdUsuario = usuario.Id,
                IdEdificio = usuario.IdEdificio!.Value,
                EstadoConfirmacion = "Declarada",
                FechaDeclaracion = DateTime.UtcNow
            };
            _db.DeclaracionesUnidadesComunitarias.Add(declaracion);
        }

        if (await _db.DeclaracionesUnidadesComunitarias.AnyAsync(d => d.IdUsuario == usuario.Id && d.IdEdificio == usuario.IdEdificio &&
                d.IdUnidad == unidad.IdUnidad && d.Tipo == request.Tipo && d.IdDeclaracionUnidad != declaracion.IdDeclaracionUnidad, ct))
            return Conflict(new { message = "Ya existe una declaración de ese tipo para la unidad seleccionada." });

        declaracion.IdUnidad = unidad.IdUnidad;
        declaracion.Tipo = request.Tipo;
        declaracion.PisoDeclarado = unidad.Piso;
        declaracion.IdentificacionDeclarada = unidad.Identificacion;
        declaracion.EsPrincipal = request.EsPrincipal;
        declaracion.EstaAlquilada = request.Tipo == "Titularidad" ? true : request.EstaAlquilada;
        declaracion.PersonaRelacionNombre = NormalizarTexto(request.PersonaRelacionNombre);
        declaracion.PersonaRelacionApellido = NormalizarTexto(request.PersonaRelacionApellido);
        declaracion.PisoRelacion = NormalizarTexto(request.PisoRelacion);
        declaracion.IdentificacionRelacion = NormalizarTexto(request.IdentificacionRelacion);
        await _db.SaveChangesAsync(ct);
        await _vinculaciones.EvaluarAsync(usuario.Id, ct);
        return Ok(new { message = "La declaración quedó guardada y las coincidencias pendientes fueron revisadas." });
    }

    private async Task<(Usuario? Value, IActionResult? Result)> UsuarioActivoAsync(CancellationToken ct)
    {
        var usuario = await _users.GetUserAsync(User);
        if (usuario == null) return (null, Unauthorized());
        if (usuario.Estado != EstadoUsuario.Activo || !usuario.IdEdificio.HasValue) return (null, Forbid());
        var esperado = User.IsInRole("Propietario") ? "Propietario" : "Inquilino";
        var rolGuardado = usuario.IdRol.HasValue
            ? await _db.RolesAplicacion.Where(r => r.IdRol == usuario.IdRol.Value).Select(r => r.Nombre).FirstOrDefaultAsync(ct)
            : null;
        if (rolGuardado != esperado) return (null, Forbid());
        return (usuario, null);
    }

    private static string NormalizarUnidad(string value) => string.Join(' ', value.Normalize(NormalizationForm.FormKC).Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).ToUpperInvariant();
    private static string? NormalizarTexto(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static SolicitudVinculacionDto Map(SolicitudVinculacion s, string viewerId)
    {
        var viewerIsOwner = s.IdPropietario == viewerId;
        var other = viewerIsOwner ? s.Inquilino : s.Propietario;
        var otherResidence = viewerIsOwner
            ? new { Floor = s.DeclaracionInquilino?.PisoDeclarado, Unit = s.DeclaracionInquilino?.IdentificacionDeclarada }
            : new { Floor = s.DeclaracionInquilino?.PisoRelacion, Unit = s.DeclaracionInquilino?.IdentificacionRelacion };
        return new SolicitudVinculacionDto(s.IdSolicitudVinculacion, s.Estado,
            viewerIsOwner ? s.PropietarioAcepto : s.InquilinoAcepto,
            viewerIsOwner ? s.InquilinoAcepto : s.PropietarioAcepto,
            $"{other.Nombre} {other.Apellido}".Trim(), viewerIsOwner ? "Inquilino" : "Propietario",
            s.Unidad.Piso, s.Unidad.Identificacion,
            otherResidence.Floor, otherResidence.Unit,
            s.FechaCreacion, s.FechaRespuestaPropietario, s.FechaRespuestaInquilino);
    }
}
