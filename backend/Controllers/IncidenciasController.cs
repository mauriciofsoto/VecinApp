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
public class IncidenciasController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<Usuario> _userManager;
    private readonly NotificacionesService _notificacionesService;

    public IncidenciasController(
        AppDbContext context,
        UserManager<Usuario> userManager,
        NotificacionesService notificacionesService)
    {
        _context = context;
        _userManager = userManager;
        _notificacionesService = notificacionesService;
    }

    [HttpGet("categorias")]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<IActionResult> ListarCategorias()
    {
        var usuario = await UsuarioActivoAsync();
        if (usuario.Result != null) return usuario.Result;

        var categorias = await _context.CategoriasIncidencia
            .AsNoTracking()
            .OrderBy(c => c.Nombre)
            .Select(c => new CategoriaIncidenciaDto(c.IdCategoriaIncidencia, c.Nombre))
            .ToListAsync();

        return Ok(categorias);
    }

    [HttpGet("estados")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> ListarEstados()
    {
        var usuario = await UsuarioActivoAsync();
        if (usuario.Result != null) return usuario.Result;
        if (!usuario.Value!.IdEdificio.HasValue) return BadRequest(new { mensaje = "El administrador no tiene un edificio asignado." });

        var estados = await _context.EstadosIncidencia
            .AsNoTracking()
            .OrderBy(e => e.IdEstadoIncidencia)
            .Select(e => new EstadoIncidenciaDto(e.IdEstadoIncidencia, e.Nombre))
            .ToListAsync();

        return Ok(estados);
    }

    [HttpPost]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<IActionResult> Crear([FromBody] CrearIncidenciaRequest request)
    {
        var usuarioResult = await UsuarioActivoAsync();
        if (usuarioResult.Result != null) return usuarioResult.Result;
        var usuario = usuarioResult.Value!;

        var idEdificio = usuario.IdEdificio;
        if (!idEdificio.HasValue)
        {
            var edificiosAsociados = await _context.UsuariosUnidades
                .AsNoTracking()
                .Where(relacion => relacion.IdUsuario == usuario.Id)
                .Select(relacion => relacion.Unidad.IdEdificio)
                .Distinct()
                .Take(2)
                .ToListAsync();

            if (edificiosAsociados.Count == 0)
                return BadRequest(new { mensaje = "Tu cuenta no tiene un edificio asignado ni unidades asociadas." });
            if (edificiosAsociados.Count > 1)
                return BadRequest(new { mensaje = "Tu cuenta tiene unidades en más de un edificio y no se puede determinar dónde registrar la incidencia." });

            idEdificio = edificiosAsociados[0];
        }

        var titulo = request.Titulo.Trim();
        var descripcion = request.Descripcion.Trim();
        var ubicacion = request.Ubicacion.Trim();
        var prioridad = NormalizarPrioridad(request.Prioridad);

        if (titulo.Length == 0 || descripcion.Length == 0 || ubicacion.Length == 0)
            return BadRequest(new { mensaje = "Título, descripción y ubicación son obligatorios." });
        if (prioridad == null)
            return BadRequest(new { mensaje = "La prioridad debe ser Baja, Media o Alta." });

        var categoria = await _context.CategoriasIncidencia
            .FirstOrDefaultAsync(c => c.IdCategoriaIncidencia == request.IdCategoriaIncidencia);
        if (categoria == null)
            return BadRequest(new { mensaje = "La categoría indicada no existe." });

        var estadoPendiente = await _context.EstadosIncidencia
            .FirstOrDefaultAsync(e => e.Nombre.ToLower() == "pendiente");
        if (estadoPendiente == null)
            return StatusCode(500, new { mensaje = "No existe el estado Pendiente en la base de datos." });

        var incidencia = new Incidencia
        {
            IdEdificio = idEdificio.Value,
            IdUsuarioReportante = usuario.Id,
            IdEstadoIncidencia = estadoPendiente.IdEstadoIncidencia,
            IdCategoriaIncidencia = categoria.IdCategoriaIncidencia,
            Titulo = titulo,
            Descripcion = descripcion,
            Ubicacion = ubicacion,
            Prioridad = prioridad,
            FechaCreacion = DateTime.UtcNow,
            Edificio = null!,
            UsuarioReportante = usuario,
            CategoriaIncidencia = categoria,
            EstadoIncidencia = estadoPendiente
        };

        _context.Incidencias.Add(incidencia);
        await _context.SaveChangesAsync();

        await _notificacionesService.NotificarAAdministradoresAsync(
            idEdificio.Value,
            "Incidencia",
            $"Se registró una nueva incidencia: {incidencia.Titulo}",
            "Nueva incidencia",
            "/incidencias");

        return Created(
            $"/api/incidencias/{incidencia.IdIncidencia}",
            MapIncidencia(incidencia));
    }

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Listar()
    {
        var usuarioResult = await UsuarioActivoAsync();
        if (usuarioResult.Result != null) return usuarioResult.Result;
        var usuario = usuarioResult.Value!;

        if (!usuario.IdEdificio.HasValue)
            return BadRequest(new { mensaje = "El administrador no tiene un edificio asignado." });

        var incidencias = await _context.Incidencias
            .AsNoTracking()
            .Where(i => i.IdEdificio == usuario.IdEdificio.Value)
            .OrderByDescending(i => i.FechaCreacion)
            .Select(i => new IncidenciaDto(
                i.IdIncidencia,
                i.IdEstadoIncidencia,
                i.IdCategoriaIncidencia,
                i.IdUsuarioReportante,
                i.IdUsuarioResponsable,
                i.Titulo,
                i.Descripcion,
                i.Ubicacion,
                i.Prioridad,
                i.FechaCreacion,
                i.EstadoIncidencia.Nombre,
                i.CategoriaIncidencia.Nombre,
                i.UsuarioReportante.Nombre + " " + i.UsuarioReportante.Apellido,
                i.UsuarioResponsable == null ? null : i.UsuarioResponsable.Nombre + " " + i.UsuarioResponsable.Apellido))
            .ToListAsync();

        return Ok(incidencias);
    }

    [HttpGet("mis-incidencias")]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<IActionResult> ListarMisIncidencias()
    {
        var usuarioResult = await UsuarioActivoAsync();
        if (usuarioResult.Result != null) return usuarioResult.Result;
        var usuario = usuarioResult.Value!;

        var incidencias = await _context.Incidencias
            .AsNoTracking()
            .Where(i => i.IdUsuarioReportante == usuario.Id)
            .OrderByDescending(i => i.FechaCreacion)
            .Select(i => new IncidenciaDto(
                i.IdIncidencia,
                i.IdEstadoIncidencia,
                i.IdCategoriaIncidencia,
                i.IdUsuarioReportante,
                i.IdUsuarioResponsable,
                i.Titulo,
                i.Descripcion,
                i.Ubicacion,
                i.Prioridad,
                i.FechaCreacion,
                i.EstadoIncidencia.Nombre,
                i.CategoriaIncidencia.Nombre,
                i.UsuarioReportante.Nombre + " " + i.UsuarioReportante.Apellido,
                i.UsuarioResponsable == null ? null : i.UsuarioResponsable.Nombre + " " + i.UsuarioResponsable.Apellido))
            .ToListAsync();

        return Ok(incidencias);
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Administrador,Inquilino,Propietario")]
    public async Task<IActionResult> ObtenerDetalle(int id)
    {
        var usuarioResult = await UsuarioActivoAsync();
        if (usuarioResult.Result != null) return usuarioResult.Result;
        var usuario = usuarioResult.Value!;

        if (User.IsInRole("Administrador") && !usuario.IdEdificio.HasValue)
            return BadRequest(new { mensaje = "El administrador no tiene un edificio asignado." });

        var incidencia = await IncidenciasAccesibles(usuario)
            .AsNoTracking()
            .Where(i => i.IdIncidencia == id)
            .Select(i => new IncidenciaDto(
                i.IdIncidencia,
                i.IdEstadoIncidencia,
                i.IdCategoriaIncidencia,
                i.IdUsuarioReportante,
                i.IdUsuarioResponsable,
                i.Titulo,
                i.Descripcion,
                i.Ubicacion,
                i.Prioridad,
                i.FechaCreacion,
                i.EstadoIncidencia.Nombre,
                i.CategoriaIncidencia.Nombre,
                i.UsuarioReportante.Nombre + " " + i.UsuarioReportante.Apellido,
                i.UsuarioResponsable == null ? null : i.UsuarioResponsable.Nombre + " " + i.UsuarioResponsable.Apellido))
            .FirstOrDefaultAsync();

        return incidencia == null
            ? NotFound(new { mensaje = "No se encontró la incidencia accesible para tu usuario." })
            : Ok(incidencia);
    }

    [HttpPut("{id:int}/estado")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> CambiarEstado(int id, [FromBody] CambiarEstadoIncidenciaRequest request)
    {
        var usuarioResult = await UsuarioActivoAsync();
        if (usuarioResult.Result != null) return usuarioResult.Result;
        var usuario = usuarioResult.Value!;

        if (!usuario.IdEdificio.HasValue)
            return BadRequest(new { mensaje = "El administrador no tiene un edificio asignado." });

        var incidencia = await _context.Incidencias
            .Include(i => i.EstadoIncidencia)
            .FirstOrDefaultAsync(i => i.IdIncidencia == id && i.IdEdificio == usuario.IdEdificio.Value);
        if (incidencia == null)
            return NotFound(new { mensaje = "No se encontró la incidencia en tu edificio." });

        var nuevoEstado = await _context.EstadosIncidencia
            .FirstOrDefaultAsync(e => e.IdEstadoIncidencia == request.IdEstadoIncidencia);
        if (nuevoEstado == null)
            return BadRequest(new { mensaje = "El estado indicado no existe." });
        if (!TransicionPermitida(incidencia.EstadoIncidencia.Nombre, nuevoEstado.Nombre))
            return BadRequest(new { mensaje = "La transición de estado no está permitida." });

        incidencia.IdEstadoIncidencia = nuevoEstado.IdEstadoIncidencia;
        incidencia.EstadoIncidencia = nuevoEstado;
        incidencia.IdUsuarioResponsable = usuario.Id;
        incidencia.UsuarioResponsable = usuario;
        await _context.SaveChangesAsync();

        await _notificacionesService.CrearParaUsuariosAsync(
            new[] { incidencia.IdUsuarioReportante },
            "Incidencia",
            $"El estado de tu incidencia '{incidencia.Titulo}' cambió a {nuevoEstado.Nombre}.",
            "Actualización de incidencia",
            "/mis-incidencias");

        return Ok(new CambiarEstadoIncidenciaResponse(
            incidencia.IdIncidencia,
            nuevoEstado.IdEstadoIncidencia,
            nuevoEstado.Nombre,
            "Estado actualizado correctamente."));
    }

    [HttpGet("{id:int}/mensajes")]
    [Authorize(Roles = "Administrador,Inquilino,Propietario")]
    public async Task<IActionResult> ListarMensajes(int id)
    {
        var usuarioResult = await UsuarioActivoAsync();
        if (usuarioResult.Result != null) return usuarioResult.Result;
        var usuario = usuarioResult.Value!;

        if (User.IsInRole("Administrador") && !usuario.IdEdificio.HasValue)
            return BadRequest(new { mensaje = "El administrador no tiene un edificio asignado." });

        var incidenciaExiste = await IncidenciasAccesibles(usuario)
            .AnyAsync(i => i.IdIncidencia == id);
        if (!incidenciaExiste)
            return NotFound(new { mensaje = "No se encontró la incidencia accesible para tu usuario." });

        var mensajes = await _context.MensajesIncidencia
            .AsNoTracking()
            .Where(m => m.IdIncidencia == id)
            .OrderBy(m => m.FechaCreacion)
            .Select(m => new MensajeIncidenciaDto(
                m.IdMensajeIncidencia,
                m.IdIncidencia,
                m.IdUsuarioEmisor,
                m.UsuarioEmisor.Nombre + " " + m.UsuarioEmisor.Apellido,
                m.UsuarioEmisor.Rol != null && m.UsuarioEmisor.Rol.Nombre == "Administrador" ? "administrador" : "usuario",
                m.Contenido,
                m.FechaCreacion))
            .ToListAsync();

        return Ok(mensajes);
    }

    [HttpPost("{id:int}/mensajes")]
    [Authorize(Roles = "Administrador,Inquilino,Propietario")]
    public async Task<IActionResult> CrearMensaje(int id, [FromBody] CrearMensajeIncidenciaRequest request)
    {
        var usuarioResult = await UsuarioActivoAsync();
        if (usuarioResult.Result != null) return usuarioResult.Result;
        var usuario = usuarioResult.Value!;

        if (User.IsInRole("Administrador") && !usuario.IdEdificio.HasValue)
            return BadRequest(new { mensaje = "El administrador no tiene un edificio asignado." });

        var incidencia = await IncidenciasAccesibles(usuario)
            .FirstOrDefaultAsync(i => i.IdIncidencia == id);
        if (incidencia == null)
            return NotFound(new { mensaje = "No se encontró la incidencia accesible para tu usuario." });

        var contenido = request.Contenido.Trim();
        if (contenido.Length == 0)
            return BadRequest(new { mensaje = "El mensaje no puede estar vacío." });

        var mensaje = new MensajeIncidencia
        {
            IdIncidencia = incidencia.IdIncidencia,
            IdUsuarioEmisor = usuario.Id,
            Contenido = contenido,
            FechaCreacion = DateTime.UtcNow,
            Incidencia = incidencia,
            UsuarioEmisor = usuario
        };

        _context.MensajesIncidencia.Add(mensaje);
        await _context.SaveChangesAsync();

        if (User.IsInRole("Administrador"))
        {
            await _notificacionesService.CrearParaUsuariosAsync(
                new[] { incidencia.IdUsuarioReportante },
                "Incidencia",
                $"Administración respondió en la incidencia '{incidencia.Titulo}'.",
                "Nueva respuesta",
                "/mis-incidencias");
        }
        else if (incidencia.IdEdificio > 0)
        {
            await _notificacionesService.NotificarAAdministradoresAsync(
                incidencia.IdEdificio,
                "Incidencia",
                $"El residente respondió en la incidencia '{incidencia.Titulo}'.",
                "Nueva respuesta",
                "/incidencias");
        }

        return Created(
            $"/api/incidencias/{id}/mensajes/{mensaje.IdMensajeIncidencia}",
            new MensajeIncidenciaDto(
                mensaje.IdMensajeIncidencia,
                mensaje.IdIncidencia,
                mensaje.IdUsuarioEmisor,
                usuario.Nombre + " " + usuario.Apellido,
                User.IsInRole("Administrador") ? "administrador" : "usuario",
                mensaje.Contenido,
                mensaje.FechaCreacion));
    }

    private async Task<(Usuario? Value, IActionResult? Result)> UsuarioActivoAsync()
    {
        var usuario = await _userManager.GetUserAsync(User);
        if (usuario == null) return (null, Unauthorized());
        if (usuario.Estado != EstadoUsuario.Activo) return (null, Forbid());
        return (usuario, null);
    }

    private IQueryable<Incidencia> IncidenciasAccesibles(Usuario usuario)
    {
        var query = _context.Incidencias.AsQueryable();
        if (User.IsInRole("Administrador"))
        {
            if (!usuario.IdEdificio.HasValue) return query.Where(_ => false);
            return query.Where(i => i.IdEdificio == usuario.IdEdificio.Value);
        }

        return query.Where(i => i.IdUsuarioReportante == usuario.Id);
    }

    private static bool TransicionPermitida(string actual, string destino)
    {
        var source = NormalizarEstado(actual);
        var target = NormalizarEstado(destino);
        if (source == target) return false;

        return source switch
        {
            "pendiente" => target is "en proceso" or "rechazada",
            "en proceso" => target is "resuelta" or "rechazada",
            _ => false
        };
    }

    private static string NormalizarEstado(string value) =>
        value.Trim().ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD)
            .Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
            .Aggregate(string.Empty, (text, c) => text + c)
            .Replace('-', ' ');

    private static string? NormalizarPrioridad(string value)
    {
        var prioridad = value.Trim();
        if (prioridad.Equals("baja", StringComparison.OrdinalIgnoreCase)) return "Baja";
        if (prioridad.Equals("media", StringComparison.OrdinalIgnoreCase)) return "Media";
        if (prioridad.Equals("alta", StringComparison.OrdinalIgnoreCase)) return "Alta";
        return null;
    }

    private static IncidenciaDto MapIncidencia(Incidencia incidencia) =>
        new(
            incidencia.IdIncidencia,
            incidencia.IdEstadoIncidencia,
            incidencia.IdCategoriaIncidencia,
            incidencia.IdUsuarioReportante,
            incidencia.IdUsuarioResponsable,
            incidencia.Titulo,
            incidencia.Descripcion,
            incidencia.Ubicacion,
            incidencia.Prioridad,
            incidencia.FechaCreacion,
            incidencia.EstadoIncidencia.Nombre,
            incidencia.CategoriaIncidencia.Nombre,
            incidencia.UsuarioReportante.Nombre + " " + incidencia.UsuarioReportante.Apellido,
            incidencia.UsuarioResponsable == null ? null : incidencia.UsuarioResponsable.Nombre + " " + incidencia.UsuarioResponsable.Apellido);
}

public sealed record CategoriaIncidenciaDto(int IdCategoriaIncidencia, string Nombre);
public sealed record EstadoIncidenciaDto(int IdEstadoIncidencia, string Nombre);
public sealed record IncidenciaDto(
    int IdIncidencia,
    int IdEstadoIncidencia,
    int IdCategoriaIncidencia,
    string IdUsuarioReportante,
    string? IdUsuarioResponsable,
    string Titulo,
    string Descripcion,
    string? Ubicacion,
    string Prioridad,
    DateTime FechaCreacion,
    string Estado,
    string Categoria,
    string Reportante,
    string? Responsable);
public sealed record CambiarEstadoIncidenciaResponse(int IdIncidencia, int IdEstadoIncidencia, string Estado, string Mensaje);

public sealed class CrearIncidenciaRequest
{
    [Range(1, int.MaxValue)]
    public int IdCategoriaIncidencia { get; init; }

    [Required, StringLength(100)]
    public string Titulo { get; init; } = string.Empty;

    [Required, StringLength(1000)]
    public string Descripcion { get; init; } = string.Empty;

    [Required, StringLength(150)]
    public string Ubicacion { get; init; } = string.Empty;

    [Required]
    public string Prioridad { get; init; } = string.Empty;
}

public sealed class CambiarEstadoIncidenciaRequest
{
    [Range(1, int.MaxValue)]
    public int IdEstadoIncidencia { get; init; }
}

public sealed class CrearMensajeIncidenciaRequest
{
    [Required, StringLength(2000)]
    public string Contenido { get; init; } = string.Empty;
}

public sealed record MensajeIncidenciaDto(
    int IdMensajeIncidencia,
    int IdIncidencia,
    string IdUsuarioEmisor,
    string EmisorNombre,
    string RolEmisor,
    string Contenido,
    DateTime FechaCreacion);
