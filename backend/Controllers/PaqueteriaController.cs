using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.DTOs;
using VecinApp.Models;

namespace VecinApp.Controllers;

[ApiController]
[Route("api/paqueteria")]
[Authorize]
public sealed class PaqueteriaController : ControllerBase
{
    private const string Pendiente = "Pendiente";
    private const string Entregado = "Entregado";
    private const string Confirmado = "Confirmado";
    private readonly AppDbContext _context;
    private readonly UserManager<Usuario> _userManager;

    public PaqueteriaController(AppDbContext context, UserManager<Usuario> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet("destinatarios")]
    [Authorize(Roles = "Administrador,Portero")]
    public async Task<ActionResult<IReadOnlyList<DestinatarioPaqueteDto>>> ObtenerDestinatarios(CancellationToken ct)
    {
        var actual = await UsuarioActivoAsync();
        if (actual is null) return Unauthorized();
        if (actual.Estado != EstadoUsuario.Activo || !actual.IdEdificio.HasValue) return Forbid();
        var edificio = actual.IdEdificio.Value;
        var roles = new[] { "Inquilino", "Propietario" };
        var personas = await _context.Users.AsNoTracking()
            .Where(u => u.IdEdificio == edificio && u.Estado == EstadoUsuario.Activo && u.Rol != null && roles.Contains(u.Rol.Nombre))
            .OrderBy(u => u.Apellido).ThenBy(u => u.Nombre)
            .Select(u => new { u.Id, u.Nombre, u.Apellido })
            .ToListAsync(ct);
        var ids = personas.Select(p => p.Id).ToArray();
        var declaraciones = await _context.DeclaracionesUnidadesComunitarias.AsNoTracking()
            .Where(d => d.IdEdificio == edificio && ids.Contains(d.IdUsuario))
            .OrderBy(d => d.FechaDeclaracion)
            .Select(d => new { d.IdUsuario, Unidad = new UnidadDeclaradaPaqueteDto(d.PisoDeclarado, d.IdentificacionDeclarada, "No verificada") })
            .ToListAsync(ct);
        var porUsuario = declaraciones.GroupBy(d => d.IdUsuario)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<UnidadDeclaradaPaqueteDto>)g.Select(x => x.Unidad).ToList());
        return Ok(personas.Select(p => new DestinatarioPaqueteDto(p.Id, p.Nombre, p.Apellido,
            porUsuario.GetValueOrDefault(p.Id, Array.Empty<UnidadDeclaradaPaqueteDto>()))).ToArray());
    }

    [HttpPost]
    [Authorize(Roles = "Administrador,Portero")]
    public async Task<ActionResult<PaqueteDto>> Registrar([FromBody] RegistrarPaqueteRequest request, CancellationToken ct)
    {
        var actual = await UsuarioActivoAsync();
        if (actual is null) return Unauthorized();
        if (actual.Estado != EstadoUsuario.Activo || !actual.IdEdificio.HasValue) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Remitente) || string.IsNullOrWhiteSpace(request.Identificacion) || string.IsNullOrWhiteSpace(request.IdUsuarioDestinatario))
            return BadRequest(new { mensaje = "Destinatario, remitente e identificación son obligatorios." });
        var destinatario = await _context.Users.Include(u => u.Rol).FirstOrDefaultAsync(u => u.Id == request.IdUsuarioDestinatario, ct);
        if (destinatario is null || destinatario.Estado != EstadoUsuario.Activo || destinatario.IdEdificio != actual.IdEdificio || destinatario.Rol?.Nombre is not ("Inquilino" or "Propietario"))
            return BadRequest(new { mensaje = "El destinatario no es un residente activo del edificio." });
        var paquete = new Paquete
        {
            IdEdificio = actual.IdEdificio.Value,
            IdUsuarioRegistro = actual.Id,
            IdUsuarioDestinatario = destinatario.Id,
            Remitente = request.Remitente.Trim(),
            Identificacion = request.Identificacion.Trim(),
            Observaciones = string.IsNullOrWhiteSpace(request.Observaciones) ? null : request.Observaciones.Trim(),
            FechaRecepcion = DateTime.UtcNow,
            Estado = Pendiente
        };
        _context.Paquetes.Add(paquete);
        await _context.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(ListarRecepcion), new { id = paquete.IdPaquete }, new PaqueteDto(
            paquete.IdPaquete, paquete.Identificacion, paquete.Remitente, destinatario.Id, destinatario.Nombre,
            destinatario.Apellido, paquete.Estado, paquete.FechaRecepcion, null, null, paquete.Observaciones));
    }

    [HttpGet]
    [Authorize(Roles = "Administrador,Portero")]
    public async Task<ActionResult<IReadOnlyList<PaqueteDto>>> ListarRecepcion(CancellationToken ct)
    {
        var actual = await UsuarioActivoAsync();
        if (actual is null) return Unauthorized();
        if (actual.Estado != EstadoUsuario.Activo || !actual.IdEdificio.HasValue) return Forbid();
        var paquetes = await _context.Paquetes.AsNoTracking().Where(p => p.IdEdificio == actual.IdEdificio && p.FechaEliminacion == null)
            .OrderByDescending(p => p.FechaRecepcion)
            .Select(p => new PaqueteDto(p.IdPaquete, p.Identificacion, p.Remitente, p.IdUsuarioDestinatario,
                p.UsuarioDestinatario.Nombre, p.UsuarioDestinatario.Apellido, p.Estado, p.FechaRecepcion,
                p.FechaEntrega, p.FechaConfirmacion, p.Observaciones)).ToListAsync(ct);
        return Ok(paquetes);
    }

    [HttpGet("mis-paquetes")]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<ActionResult<IReadOnlyList<PaqueteDto>>> MisPaquetes(CancellationToken ct)
    {
        var actual = await UsuarioActivoAsync();
        if (actual is null) return Unauthorized();
        if (actual.Estado != EstadoUsuario.Activo) return Forbid();
        var paquetes = await _context.Paquetes.AsNoTracking()
            .Where(p => p.IdUsuarioDestinatario == actual.Id && p.FechaEliminacion == null)
            .OrderByDescending(p => p.FechaRecepcion)
            .Select(p => new PaqueteDto(p.IdPaquete, p.Identificacion, p.Remitente, p.IdUsuarioDestinatario,
                p.UsuarioDestinatario.Nombre, p.UsuarioDestinatario.Apellido, p.Estado, p.FechaRecepcion,
                p.FechaEntrega, p.FechaConfirmacion, p.Observaciones)).ToListAsync(ct);
        return Ok(paquetes);
    }

    [HttpPost("{id:int}/entrega")]
    [Authorize(Roles = "Administrador,Portero")]
    public async Task<IActionResult> RegistrarEntrega(int id, CancellationToken ct)
    {
        var actual = await UsuarioActivoAsync();
        if (actual is null) return Unauthorized();
        if (actual.Estado != EstadoUsuario.Activo || !actual.IdEdificio.HasValue) return Forbid();
        var paquete = await _context.Paquetes.FirstOrDefaultAsync(p => p.IdPaquete == id && p.IdEdificio == actual.IdEdificio && p.FechaEliminacion == null, ct);
        if (paquete is null) return NotFound();
        if (paquete.Estado != Pendiente || paquete.FechaEntrega.HasValue || paquete.FechaConfirmacion.HasValue) return Conflict(new { mensaje = "El paquete no permite registrar una entrega física." });
        paquete.FechaEntrega = DateTime.UtcNow;
        paquete.IdUsuarioEntrega = actual.Id;
        paquete.Estado = Entregado;
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:int}/confirmacion")]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<IActionResult> Confirmar(int id, CancellationToken ct)
    {
        var actual = await UsuarioActivoAsync();
        if (actual is null) return Unauthorized();
        if (actual.Estado != EstadoUsuario.Activo) return Forbid();
        var paquete = await _context.Paquetes.FirstOrDefaultAsync(p => p.IdPaquete == id && p.IdUsuarioDestinatario == actual.Id && p.FechaEliminacion == null, ct);
        if (paquete is null) return NotFound();
        if (paquete.Estado != Entregado || !paquete.FechaEntrega.HasValue || paquete.FechaConfirmacion.HasValue) return Conflict(new { mensaje = "Solo se puede confirmar una entrega física pendiente de confirmación." });
        paquete.FechaConfirmacion = DateTime.UtcNow;
        paquete.Estado = Confirmado;
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("{id:int}/mensajes")]
    public async Task<IActionResult> ObtenerMensajes(int id, CancellationToken ct)
    {
        var acceso = await PaqueteAccesibleAsync(id, ct);
        if (acceso.Result is not null) return acceso.Result;
        var mensajes = await _context.MensajesPaquete.AsNoTracking().Where(m => m.IdPaquete == id)
            .OrderBy(m => m.FechaEnvio).ThenBy(m => m.IdMensajePaquete)
            .Select(m => new MensajePaqueteDto(m.IdMensajePaquete, m.UsuarioEmisor.Nombre,
                m.UsuarioEmisor.Apellido, m.Contenido, m.FechaEnvio))
            .ToListAsync(ct);
        return Ok(mensajes);
    }

    [HttpPost("{id:int}/mensajes")]
    public async Task<IActionResult> EnviarMensaje(int id, [FromBody] CrearMensajePaqueteRequest request, CancellationToken ct)
    {
        var acceso = await PaqueteAccesibleAsync(id, ct);
        if (acceso.Result is not null) return acceso.Result;
        var actual = acceso.Usuario!;
        var contenido = request.Contenido?.Trim();
        if (string.IsNullOrWhiteSpace(contenido)) return BadRequest(new { mensaje = "El mensaje no puede estar vacío." });
        var mensaje = new MensajePaquete { IdPaquete = id, IdUsuarioEmisor = actual.Id, Contenido = contenido, FechaEnvio = DateTime.UtcNow };
        _context.MensajesPaquete.Add(mensaje);
        await _context.SaveChangesAsync(ct);
        return Ok(new MensajePaqueteDto(mensaje.IdMensajePaquete, actual.Nombre, actual.Apellido,
            mensaje.Contenido, mensaje.FechaEnvio));
    }

    private async Task<Usuario?> UsuarioActivoAsync() => await _userManager.GetUserAsync(User);

    private async Task<(Usuario? Usuario, IActionResult? Result)> PaqueteAccesibleAsync(int id, CancellationToken ct)
    {
        var actual = await UsuarioActivoAsync();
        if (actual is null) return (null, Unauthorized());
        if (actual.Estado != EstadoUsuario.Activo) return (null, Forbid());
        var paquete = await _context.Paquetes.AsNoTracking().FirstOrDefaultAsync(p => p.IdPaquete == id && p.FechaEliminacion == null, ct);
        if (paquete is null) return (null, NotFound());
        if (User.IsInRole("Inquilino") || User.IsInRole("Propietario"))
            return paquete.IdUsuarioDestinatario == actual.Id ? (actual, null) : (null, NotFound());
        if ((User.IsInRole("Administrador") || User.IsInRole("Portero")) && actual.IdEdificio == paquete.IdEdificio)
            return (actual, null);
        return (null, Forbid());
    }
}
