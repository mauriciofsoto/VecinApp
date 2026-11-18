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
    public async Task<IActionResult> Destinatarios(
        int id,
        [FromQuery] string tipo,
        CancellationToken ct)
    {
        var admin = await AdminActivo(ct);
        if (admin.Result != null) return admin.Result;

        if (tipo is not ("Propietario" or "Personal"))
            return BadRequest(new { mensaje = "Tipo de destinatario no válido." });

        var edificioId = admin.Value!.IdEdificio!.Value;

        var incidencia = await _db.Incidencias
            .AsNoTracking()
            .FirstOrDefaultAsync(
                i => i.IdIncidencia == id && i.IdEdificio == edificioId,
                ct);

        if (incidencia == null)
            return NotFound(new { mensaje = "No se encontró la incidencia en tu edificio." });

        var query = _db.Users
            .AsNoTracking()
            .Where(u => u.Estado == EstadoUsuario.Activo);

        if (tipo == "Personal")
        {
            // Espacios comunes: solamente porteros del mismo edificio.
            query = query.Where(u =>
                u.IdEdificio == edificioId &&
                u.Rol != null &&
                u.Rol.Nombre == "Portero");
        }
        else
        {
            // Unidad específica: solamente propietarios vinculados a esa unidad.
            if (!incidencia.IdUnidad.HasValue)
                return BadRequest(new
                {
                    mensaje = "Las incidencias de espacios comunes deben derivarse a portería."
                });

            var idUnidad = incidencia.IdUnidad.Value;

            query = query.Where(u =>
                u.Rol != null &&
                u.Rol.Nombre == "Propietario" &&
                _db.UsuariosUnidades.Any(uu =>
                    uu.IdUsuario == u.Id &&
                    uu.IdUnidad == idUnidad &&
                    uu.Unidad.IdEdificio == edificioId &&
                    uu.TipoRelacion == "Propietario"));
        }

        var items = await query
            .OrderBy(u => u.Apellido)
            .ThenBy(u => u.Nombre)
            .Select(u => new
            {
                id = u.Id,
                nombre = u.Nombre,
                apellido = u.Apellido
            })
            .ToListAsync(ct);

        return Ok(items);
    }



    [HttpPost("{id:int}/derivaciones")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Derivar(
        int id,
        [FromBody] CrearDerivacionRequest request,
        CancellationToken ct)
    {
        var admin = await AdminActivo(ct);
        if (admin.Result != null) return admin.Result;

        if (request.TipoDestinatario is not ("Propietario" or "Personal"))
            return BadRequest(new { mensaje = "Tipo de destinatario no válido." });

        var edificioId = admin.Value!.IdEdificio!.Value;

        var incidencia = await _db.Incidencias
            .FirstOrDefaultAsync(
                i => i.IdIncidencia == id && i.IdEdificio == edificioId,
                ct);

        if (incidencia == null)
            return NotFound(new { mensaje = "No se encontró la incidencia en tu edificio." });

        var estadoIncidencia = await _db.EstadosIncidencia
            .Where(e => e.IdEstadoIncidencia == incidencia.IdEstadoIncidencia)
            .Select(e => e.Nombre)
            .FirstOrDefaultAsync(ct);

        if (string.Equals(estadoIncidencia, "Cerrada", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new
            {
                mensaje = "No se puede derivar una incidencia que ya está cerrada."
            });
        }

        var usuario = await _db.Users
            .Include(u => u.Rol)
            .FirstOrDefaultAsync(u => u.Id == request.IdUsuarioDestinatario, ct);

        var rolEsperado = request.TipoDestinatario == "Personal"
            ? "Portero"
            : "Propietario";

        if (request.TipoDestinatario == "Personal" &&
            usuario?.IdEdificio != edificioId)
        {
            return BadRequest(new
            {
                mensaje = "El portero debe pertenecer a tu edificio."
            });
        }

        if (usuario == null ||
            usuario.Estado != EstadoUsuario.Activo ||
            usuario.Rol?.Nombre != rolEsperado ||
            (request.TipoDestinatario == "Personal" &&
             usuario.IdEdificio != edificioId))
        {
            return BadRequest(new
            {
                mensaje = "El destinatario debe ser un usuario activo autorizado de tu edificio."
            });
        }

        Unidad? unidad = null;

        if (request.TipoDestinatario == "Propietario")
        {
            if (!incidencia.IdUnidad.HasValue)
            {
                return BadRequest(new
                {
                    mensaje = "No se puede derivar a un propietario una incidencia sin unidad asociada."
                });
            }

            var idUnidad = incidencia.IdUnidad.Value;

            unidad = await _db.Unidades
                .FirstOrDefaultAsync(
                    u => u.IdUnidad == idUnidad && u.IdEdificio == edificioId,
                    ct);

            if (unidad == null)
            {
                return BadRequest(new
                {
                    mensaje = "La unidad asociada a la incidencia no pertenece a tu edificio."
                });
            }

            var esPropietarioDeLaUnidad = await _db.UsuariosUnidades
                .AnyAsync(propiedad =>
                    propiedad.IdUsuario == usuario.Id &&
                    propiedad.IdUnidad == idUnidad &&
                    propiedad.Unidad.IdEdificio == edificioId &&
                    propiedad.TipoRelacion == "Propietario",
                    ct);

            if (!esPropietarioDeLaUnidad)
            {
                return BadRequest(new
                {
                    mensaje = "El destinatario no tiene una relación de titularidad con la unidad de la incidencia."
                });
            }
        }

        var exists = await _db.DerivacionesIncidencia
            .AnyAsync(d =>
                d.IdIncidencia == id &&
                d.IdUsuarioDestinatario == usuario.Id &&
                d.TipoDestinatario == request.TipoDestinatario,
                ct);

        if (exists)
            return Conflict(new
            {
                mensaje = "Esta incidencia ya fue derivada a ese destinatario."
            });

        var derivacion = new DerivacionIncidencia
        {
            IdIncidencia = id,
            IdUsuarioAdministrador = admin.Value.Id,
            IdUsuarioDestinatario = usuario.Id,
            TipoDestinatario = request.TipoDestinatario,
            IdUnidad = unidad?.IdUnidad,
            FechaDerivacion = DateTime.UtcNow
        };

        _db.DerivacionesIncidencia.Add(derivacion);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return Conflict(new
            {
                mensaje = "Esta incidencia ya fue derivada a ese destinatario."
            });
        }

        await _notifications.CrearParaUsuariosAsync(
            new[] { usuario.Id },
            "Incidencia",
            $"Se te asignó la incidencia '{incidencia.Titulo}'.",
            "Nueva incidencia asignada",
            "/incidencias/derivadas");

        await _notifications.CrearParaUsuariosAsync(
            new[] { incidencia.IdUsuarioReportante },
            "Incidencia",
            $"Tu incidencia '{incidencia.Titulo}' fue derivada.",
            "Incidencia derivada",
            "/mis-incidencias");

        return Created(
            $"/api/incidencias/derivadas/{derivacion.IdDerivacionIncidencia}",
            new
            {
                derivacion.IdDerivacionIncidencia,
                derivacion.FechaDerivacion
            });
    }



    [HttpGet("derivadas")]
    [Authorize(Roles = "Propietario,Portero")]
    public async Task<IActionResult> MisDerivaciones(CancellationToken ct)
    {
        var usuario = await _users.GetUserAsync(User);

        if (usuario == null)
            return Unauthorized();

        if (usuario.Estado != EstadoUsuario.Activo)
            return Forbid();

        if (!usuario.IdEdificio.HasValue)
            return Forbid();

        var tipo = User.IsInRole("Propietario")
            ? "Propietario"
            : "Personal";

        var edificioId = usuario.IdEdificio.Value;

        var rows = await _db.DerivacionesIncidencia
            .AsNoTracking()
            .Where(d =>
                d.IdUsuarioDestinatario == usuario.Id &&
                d.TipoDestinatario == tipo &&
                d.Incidencia.IdEdificio == edificioId)
            .OrderByDescending(d => d.FechaDerivacion)
            .Select(d => new
            {
                idDerivacion = d.IdDerivacionIncidencia,
                tipoDestinatario = d.TipoDestinatario,
                fechaDerivacion = d.FechaDerivacion,
                administrador = d.UsuarioAdministrador.Nombre + " " +
                                d.UsuarioAdministrador.Apellido,
                idIncidencia = d.IdIncidencia,
                titulo = d.Incidencia.Titulo,
                descripcion = d.Incidencia.Descripcion,
                fechaCreacion = d.Incidencia.FechaCreacion,
                categoria = d.Incidencia.CategoriaIncidencia.Nombre,
                prioridad = d.Incidencia.Prioridad,
                reportante = d.Incidencia.UsuarioReportante.Nombre + " " +
                             d.Incidencia.UsuarioReportante.Apellido,
                estado = d.Incidencia.EstadoIncidencia.Nombre,
                ubicacion = d.Incidencia.Ubicacion,
                unidad = d.Unidad == null
                    ? null
                    : d.Unidad.Piso + " / " + d.Unidad.Identificacion
            })
            .ToListAsync(ct);
        return Ok(rows);
    }

    private async Task<(Usuario? Value, IActionResult? Result)> AdminActivo(
        CancellationToken ct)
    {
        var usuario = await _users.GetUserAsync(User);

        if (usuario == null)
            return (null, Unauthorized());

        if (usuario.Estado != EstadoUsuario.Activo)
            return (null, Forbid());

        if (!usuario.IdEdificio.HasValue)
            return (null, Forbid());

        return (usuario, null);
    }
}

// Request para crear una derivación.
public sealed class CrearDerivacionRequest
{
    [Required]
    public string IdUsuarioDestinatario { get; init; } = string.Empty;

    [Required]
    public string TipoDestinatario { get; init; } = string.Empty;
}