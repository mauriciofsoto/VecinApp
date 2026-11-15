
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.Models;

namespace VecinApp.Controllers;

[ApiController]
[Route("encuestas")]
[Authorize]
public class EncuestasController : ControllerBase
{
    private readonly AppDbContext _context;

    public EncuestasController(AppDbContext context)
    {
        _context = context;
    }

    // GET /encuestas
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EncuestaResponseDto>>> GetEncuestas()
    {
        var usuario = await ObtenerUsuarioActual();

        if (usuario == null)
            return Unauthorized();

        if (!usuario.IdEdificio.HasValue)
            return Ok(Array.Empty<EncuestaResponseDto>());

        var encuestas = await _context.Encuestas
            .Include(e => e.Publicacion)
            .Include(e => e.Opciones)
            .Include(e => e.Respuestas)
            .Where(e => e.Publicacion.IdEdificio == usuario.IdEdificio.Value)
            .OrderByDescending(e => e.FechaInicio)
            .ToListAsync();

        var resultado = encuestas
            .Select(e => MapearEncuesta(e, usuario.Id))
            .ToList();

        return Ok(resultado);
    }

    // POST /encuestas
    [HttpPost]
    public async Task<ActionResult<EncuestaResponseDto>> CrearEncuesta(
        [FromBody] CrearEncuestaRequest request)
    {
        var usuario = await ObtenerUsuarioActual();

        if (usuario == null)
            return Unauthorized();

        if (usuario.Rol?.Nombre != "Administrador" &&
            usuario.Rol?.Nombre != "SuperAdministrador")
            return Forbid();

        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");

        if (string.IsNullOrWhiteSpace(request.Titulo))
            return BadRequest("El título es obligatorio.");

        if (string.IsNullOrWhiteSpace(request.Descripcion))
            return BadRequest("La descripción es obligatoria.");

        if (request.Opciones == null ||
            request.Opciones.Count < 2 ||
            request.Opciones.Any(string.IsNullOrWhiteSpace))
            return BadRequest("La encuesta debe tener al menos dos opciones válidas.");

        var categoria = await _context.CategoriasPublicacion
            .FirstOrDefaultAsync(c => c.Nombre.ToLower() == "encuesta");

        if (categoria == null)
            return BadRequest("No se encontró la categoría encuesta.");

        var fechaInicio = DateTime.UtcNow;

        // Si no se establece una fecha límite, la encuesta dura 7 días.
        var fechaFin = request.FechaFin.HasValue
            ? DateTime.SpecifyKind(
                request.FechaFin.Value.Date.AddDays(1).AddTicks(-1),
                DateTimeKind.Utc)
            : fechaInicio.AddDays(7);

        if (fechaFin <= fechaInicio)
            return BadRequest("La fecha de cierre debe ser posterior a la fecha actual.");

        var publicacion = new Publicacion
        {
            IdUsuario = usuario.Id,
            IdEdificio = usuario.IdEdificio.Value,
            IdCategoriaPublicacion = categoria.IdCategoriaPublicacion,
            Titulo = request.Titulo.Trim(),
            Contenido = request.Descripcion.Trim(),
            FechaPublicacion = fechaInicio,
            Estado = "Publicado",
            Usuario = usuario,
            CategoriaPublicacion = categoria
        };

        var encuesta = new Encuesta
        {
            FechaInicio = fechaInicio,
            FechaFin = fechaFin,
            Estado = "EnProceso",
            Publicacion = publicacion,
            Opciones = request.Opciones
                .Select(o => new OpcionEncuesta
                {
                    Texto = o.Trim()
                })
                .ToList()
        };

        _context.Encuestas.Add(encuesta);

        await _context.SaveChangesAsync();

        var resultado = await _context.Encuestas
            .Include(e => e.Publicacion)
            .Include(e => e.Opciones)
            .Include(e => e.Respuestas)
            .FirstAsync(e => e.IdEncuesta == encuesta.IdEncuesta);

        return Ok(MapearEncuesta(resultado, usuario.Id));
    }

    // POST /encuestas/{id}/votar
    [HttpPost("{id:int}/votar")]
    public async Task<IActionResult> Votar(
        int id,
        [FromBody] VotarEncuestaRequest request)
    {
        var usuario = await ObtenerUsuarioActual();

        if (usuario == null)
            return Unauthorized();

        var encuesta = await _context.Encuestas
            .Include(e => e.Publicacion)
            .Include(e => e.Opciones)
            .Include(e => e.Respuestas)
            .FirstOrDefaultAsync(e =>
                e.IdEncuesta == id &&
                e.Publicacion.IdEdificio == usuario.IdEdificio);

        if (encuesta == null)
            return NotFound("No se encontró la encuesta.");

        if (encuesta.Estado != "EnProceso" ||
            encuesta.FechaFin <= DateTime.UtcNow)
            return BadRequest("La encuesta está cerrada.");

        var opcion = encuesta.Opciones
            .FirstOrDefault(o => o.IdOpcion == request.IdOpcion);

        if (opcion == null)
            return BadRequest("La opción seleccionada no pertenece a esta encuesta.");

        var yaVoto = encuesta.Respuestas
            .Any(r => r.IdUsuario == usuario.Id);

        if (yaVoto)
            return BadRequest("Ya registraste tu voto en esta encuesta.");

        var respuesta = new RespuestaEncuesta
        {
            IdEncuesta = encuesta.IdEncuesta,
            IdOpcion = opcion.IdOpcion,
            IdUsuario = usuario.Id,
            FechaRespuesta = DateTime.UtcNow,
            Encuesta = encuesta,
            Opcion = opcion,
            Usuario = usuario
        };

        _context.RespuestasEncuesta.Add(respuesta);

        await _context.SaveChangesAsync();

        return Ok(new { mensaje = "Voto registrado correctamente." });
    }

    // PATCH /encuestas/{id}/cerrar
    [HttpPatch("{id:int}/cerrar")]
    public async Task<IActionResult> CerrarEncuesta(int id)
    {
        var usuario = await ObtenerUsuarioActual();

        if (usuario == null)
            return Unauthorized();

        if (usuario.Rol?.Nombre != "Administrador" &&
            usuario.Rol?.Nombre != "SuperAdministrador")
            return Forbid();

        var encuesta = await _context.Encuestas
            .Include(e => e.Publicacion)
            .FirstOrDefaultAsync(e =>
                e.IdEncuesta == id &&
                e.Publicacion.IdEdificio == usuario.IdEdificio);

        if (encuesta == null)
            return NotFound("No se encontró la encuesta.");

        encuesta.Estado = "Cerrada";

        await _context.SaveChangesAsync();

        return Ok(new { mensaje = "Encuesta cerrada correctamente." });
    }

    private async Task<Usuario?> ObtenerUsuarioActual()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return null;

        return await _context.Users
            .Include(u => u.Rol)
            .FirstOrDefaultAsync(u => u.Id == userId);
    }

    private static EncuestaResponseDto MapearEncuesta(
        Encuesta encuesta,
        string usuarioId)
    {
        var cerrada = encuesta.Estado == "Cerrada" ||
                      encuesta.FechaFin <= DateTime.UtcNow;

        var opciones = encuesta.Opciones
            .Select(o => new OpcionEncuestaResponseDto(
                o.IdOpcion,
                o.Texto,
                encuesta.Respuestas.Count(r => r.IdOpcion == o.IdOpcion)
            ))
            .ToArray();

        var miVoto = encuesta.Respuestas
            .FirstOrDefault(r => r.IdUsuario == usuarioId);

        return new EncuestaResponseDto(
            encuesta.IdEncuesta,
            encuesta.Publicacion.Titulo,
            encuesta.Publicacion.Contenido,
            opciones.Select(o => o.Texto).ToArray(),
            !cerrada,
            false,
            false,
            encuesta.FechaFin,
            encuesta.FechaInicio,
            cerrada ? "cerrada" : "en-proceso",
            encuesta.Respuestas.Count,
            opciones,
            miVoto?.IdOpcion
        );
    }
}

public sealed class CrearEncuestaRequest
{
    public string Titulo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public List<string> Opciones { get; set; } = new();
    public DateTime? FechaFin { get; set; }
}

public sealed class VotarEncuestaRequest
{
    public int IdOpcion { get; set; }
}

public sealed record OpcionEncuestaResponseDto(
    int Id,
    string Texto,
    int Votos
);

public sealed record EncuestaResponseDto(
    int Id,
    string Titulo,
    string Descripcion,
    string[] Opciones,
    bool VotacionActiva,
    bool ComentariosActivos,
    bool Prioritaria,
    DateTime FechaLimite,
    DateTime FechaPublicacion,
    string Estado,
    int TotalVotos,
    OpcionEncuestaResponseDto[] VotosPorOpcion,
    int? MiVoto
);
