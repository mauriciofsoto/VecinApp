using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.Models;
using VecinApp.Services;

namespace VecinApp.Controllers;

[ApiController]
[Route("api/incidencias")]
[Authorize]
public sealed class DerivacionesIncidenciasController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<Usuario> _users;
    private readonly NotificacionesService _notifications;

    public DerivacionesIncidenciasController(AppDbContext db, UserManager<Usuario> users, NotificacionesService notifications)
    {
        _db = db;
        _users = users;
        _notifications = notifications;
    }

    [HttpGet("derivaciones/unidades")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Unidades(CancellationToken ct)
    {
        var admin = await AdminActivo(ct);
        if (admin.Result != null) return admin.Result;
        var rows = await _db.Unidades.AsNoTracking().Where(u => u.IdEdificio == admin.Value!.IdEdificio)
            .OrderBy(u => u.Piso).ThenBy(u => u.Identificacion)
            .Select(u => new { u.IdUnidad, u.Piso, u.Identificacion }).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpGet("{id:int}/derivaciones/destinatarios")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Destinatarios(int id, [FromQuery] string tipo, CancellationToken ct)
    {
        var admin = await AdminActivo(ct);
        if (admin.Result != null) return admin.Result;
        if (tipo is not ("Propietario" or "Personal")) return BadRequest(new { mensaje = "Tipo de destinatario no válido." });
        var role = tipo == "Personal" ? "Portero" : "Propietario";
        var edificioId = admin.Value!.IdEdificio!.Value;
        var incidencia = await _db.Incidencias.AsNoTracking()
            .FirstOrDefaultAsync(i => i.IdIncidencia == id && i.IdEdificio == edificioId, ct);
        if (incidencia == null) return NotFound(new { mensaje = "No se encontró la incidencia en tu edificio." });
        var query = _db.Users.AsNoTracking().Where(u => u.Estado == EstadoUsuario.Activo && u.Rol != null && u.Rol.Nombre == role);
        if (tipo == "Personal")
            query = query.Where(u => u.IdEdificio == edificioId);
        else
            query = query.Where(u => _db.UsuariosUnidades.Any(propiedad => propiedad.IdUsuario == u.Id &&
                propiedad.Unidad.IdEdificio == edificioId &&
                (propiedad.TipoRelacion == "Propietario" || propiedad.TipoRelacion == "Titularidad") &&
                _db.UsuariosUnidades.Any(residencia => residencia.IdUsuario == incidencia.IdUsuarioReportante &&
                    residencia.IdUnidad == propiedad.IdUnidad &&
                    (residencia.TipoRelacion == "Inquilino" || residencia.TipoRelacion == "Ocupacion"))));
        var items = await query
            .OrderBy(u => u.Apellido).ThenBy(u => u.Nombre)
            .Select(u => new {
                id = u.Id, nombre = u.Nombre, apellido = u.Apellido,
                perfilRegistro = _db.RegistrosComunitarios.Where(r => r.IdUsuario == u.Id).Select(r => r.Perfil).FirstOrDefault(),
                declaraUnidadesAlquiladas = _db.RegistrosComunitarios.Where(r => r.IdUsuario == u.Id).Select(r => r.DeclaraUnidadesAlquiladas).FirstOrDefault(),
                unidadesDeclaradas = _db.UsuariosUnidades.Where(relacion => relacion.IdUsuario == u.Id && relacion.Unidad.IdEdificio == edificioId)
                    .Select(relacion => new { idUnidad = relacion.IdUnidad, piso = relacion.Unidad.Piso, unidad = relacion.Unidad.Identificacion, estado = "Registrada", tipo = relacion.TipoRelacion, alquilada = (bool?)null }).ToList()
            }).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost("{id:int}/derivaciones")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Derivar(int id, [FromBody] CrearDerivacionRequest request, CancellationToken ct)
    {
        var admin = await AdminActivo(ct);
        if (admin.Result != null) return admin.Result;
        if (request.TipoDestinatario is not ("Propietario" or "Personal")) return BadRequest(new { mensaje = "Tipo de destinatario no válido." });
        var edificioId = admin.Value!.IdEdificio!.Value;
        var incidencia = await _db.Incidencias.FirstOrDefaultAsync(i => i.IdIncidencia == id && i.IdEdificio == edificioId, ct);
        if (incidencia == null) return NotFound(new { mensaje = "No se encontró la incidencia en tu edificio." });
        var usuario = await _db.Users.Include(u => u.Rol).FirstOrDefaultAsync(u => u.Id == request.IdUsuarioDestinatario, ct);
        var rolEsperado = request.TipoDestinatario == "Personal" ? "Portero" : "Propietario";
        if (usuario == null || usuario.Estado != EstadoUsuario.Activo || usuario.Rol?.Nombre != rolEsperado ||
            (request.TipoDestinatario == "Personal" && usuario.IdEdificio != edificioId))
            return BadRequest(new { mensaje = "El destinatario debe ser un usuario activo autorizado de tu edificio." });

        Unidad? unidad = null;
        if (request.TipoDestinatario == "Propietario")
        {
            var relacionada = await _db.UsuariosUnidades.AnyAsync(propiedad => propiedad.IdUsuario == usuario.Id &&
                propiedad.Unidad.IdEdificio == edificioId &&
                (propiedad.TipoRelacion == "Propietario" || propiedad.TipoRelacion == "Titularidad") &&
                _db.UsuariosUnidades.Any(residencia => residencia.IdUsuario == incidencia.IdUsuarioReportante &&
                    residencia.IdUnidad == propiedad.IdUnidad &&
                    (residencia.TipoRelacion == "Inquilino" || residencia.TipoRelacion == "Ocupacion")), ct);
            if (!relacionada) return BadRequest(new { mensaje = "El propietario no tiene una relación registrada con quien reportó la incidencia." });
            if (request.IdUnidad.HasValue)
            {
                unidad = await _db.Unidades.FirstOrDefaultAsync(u => u.IdUnidad == request.IdUnidad && u.IdEdificio == edificioId, ct);
                if (unidad == null) return BadRequest(new { mensaje = "La unidad no pertenece a tu edificio." });
            }
        }
        else if (request.IdUnidad.HasValue)
        {
            return BadRequest(new { mensaje = "La asignación a Personal no requiere una unidad." });
        }

        var exists = await _db.DerivacionesIncidencia.AnyAsync(d => d.IdIncidencia == id && d.IdUsuarioDestinatario == usuario.Id && d.TipoDestinatario == request.TipoDestinatario, ct);
        if (exists) return Conflict(new { mensaje = "Esta incidencia ya fue derivada a ese destinatario." });
        var derivacion = new DerivacionIncidencia {
            IdIncidencia = id, IdUsuarioAdministrador = admin.Value.Id, IdUsuarioDestinatario = usuario.Id,
            TipoDestinatario = request.TipoDestinatario, IdUnidad = unidad?.IdUnidad, FechaDerivacion = DateTime.UtcNow
        };
        _db.DerivacionesIncidencia.Add(derivacion);
        try { await _db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { return Conflict(new { mensaje = "Esta incidencia ya fue derivada a ese destinatario." }); }
        await _notifications.CrearParaUsuariosAsync(new[] { incidencia.IdUsuarioReportante }, "Incidencia",
            $"Tu incidencia '{incidencia.Titulo}' fue derivada.", "Incidencia derivada", "/mis-incidencias");
        return Created($"/api/incidencias/derivadas/{derivacion.IdDerivacionIncidencia}", new { derivacion.IdDerivacionIncidencia, derivacion.FechaDerivacion });
    }

    [HttpGet("derivadas")]
    [Authorize(Roles = "Propietario,Portero")]
    public async Task<IActionResult> MisDerivaciones(CancellationToken ct)
    {
        var usuario = await _users.GetUserAsync(User);
        if (usuario == null) return Unauthorized();
        if (usuario.Estado != EstadoUsuario.Activo) return Forbid();
        var tipo = User.IsInRole("Propietario") ? "Propietario" : "Personal";
        var rows = await _db.DerivacionesIncidencia.AsNoTracking()
            .Where(d => d.IdUsuarioDestinatario == usuario.Id && d.TipoDestinatario == tipo &&
                (tipo == "Propietario" || d.Incidencia.IdEdificio == usuario.IdEdificio))
            .OrderByDescending(d => d.FechaDerivacion)
            .Select(d => new {
                idDerivacion = d.IdDerivacionIncidencia, tipoDestinatario = d.TipoDestinatario,
                fechaDerivacion = d.FechaDerivacion, administrador = d.UsuarioAdministrador.Nombre + " " + d.UsuarioAdministrador.Apellido,
                idIncidencia = d.IdIncidencia, titulo = d.Incidencia.Titulo, descripcion = d.Incidencia.Descripcion,
                fechaCreacion = d.Incidencia.FechaCreacion, categoria = d.Incidencia.CategoriaIncidencia.Nombre,
                prioridad = d.Incidencia.Prioridad, reportante = d.Incidencia.UsuarioReportante.Nombre + " " + d.Incidencia.UsuarioReportante.Apellido,
                estado = d.Incidencia.EstadoIncidencia.Nombre, ubicacion = d.Incidencia.Ubicacion,
                unidad = d.Unidad == null ? null : d.Unidad.Piso + " / " + d.Unidad.Identificacion
            }).ToListAsync(ct);
        return Ok(rows);
    }

    private async Task<(Usuario? Value, IActionResult? Result)> AdminActivo(CancellationToken ct)
    {
        var user = await _users.GetUserAsync(User);
        if (user == null) return (null, Unauthorized());
        if (user.Estado != EstadoUsuario.Activo || !user.IdEdificio.HasValue) return (null, Forbid());
        return (user, null);
    }
}

public sealed class CrearDerivacionRequest
{
    [Required] public string IdUsuarioDestinatario { get; init; } = string.Empty;
    [Required] public string TipoDestinatario { get; init; } = string.Empty;
    public int? IdUnidad { get; init; }
}
