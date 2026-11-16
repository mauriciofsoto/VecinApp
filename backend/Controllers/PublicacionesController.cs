
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.Models;
using VecinApp.Helpers;
namespace VecinApp.Controllers;

[ApiController]
[Route("publicaciones")]
[Authorize]
public class PublicacionesController : ControllerBase
{
    private readonly AppDbContext _context;

    public PublicacionesController(AppDbContext context)
    {
        _context = context;
    }

    // GET /publicaciones
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PublicacionResponseDto>>> GetPublicaciones()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var usuario = await _context.Users
            .Include(u => u.Rol)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (usuario == null)
            return Unauthorized();

        // El SuperAdministrador puede no tener edificio asignado.
        if (!usuario.IdEdificio.HasValue)
            return Ok(Array.Empty<PublicacionResponseDto>());

        // Todos los usuarios del mismo edificio ven las publicaciones.
        var publicaciones = await _context.Publicaciones
    .Where(p => p.IdEdificio == usuario.IdEdificio.Value)
    .Include(p => p.Usuario)
    .ThenInclude(u => u.Rol)
    .Include(p => p.CategoriaPublicacion)
    .Include(p => p.Comentarios)
.ThenInclude(c => c.Usuario)
.Include(p => p.Reacciones)
.Include(p => p.Encuesta)
    .OrderByDescending(p => p.FechaPublicacion)
    .ToListAsync();

        var resultado = publicaciones
    .Select(p => MapearPublicacion(p, userId))
    .ToList();

        return Ok(resultado);
    }

    // POST /publicaciones
    [HttpPost]
    public async Task<ActionResult<PublicacionResponseDto>> CrearPublicacion(
        [FromBody] CrearPublicacionRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(request.Titulo))
            return BadRequest("El título es obligatorio.");
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var usuario = await _context.Users
            .Include(u => u.Rol)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (usuario == null)
            return Unauthorized();

        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");

        var tipo = request.Tipo?.Trim().ToLowerInvariant();

        if (tipo != "publicacion" && tipo != "aviso" && tipo != "encuesta")
            return BadRequest("El tipo de publicación no es válido.");

        if (string.IsNullOrWhiteSpace(request.Contenido))
            return BadRequest("El contenido es obligatorio.");
        var fechaLimite = NormalizarFechaLimite(request.FechaLimite);

        if (fechaLimite.HasValue && fechaLimite.Value <= DateTime.UtcNow)
            return BadRequest("La fecha de vencimiento debe ser futura.");
        var categoria = await _context.CategoriasPublicacion
            .FirstOrDefaultAsync(c => c.Nombre.ToLower() == tipo);

        if (categoria == null)
            return BadRequest("No se encontró la categoría de publicación.");
        var esAdministrador =
    usuario.Rol?.Nombre == "Administrador" ||
    usuario.Rol?.Nombre == "SuperAdministrador";
        var publicacion = new Publicacion
        {
            IdUsuario = usuario.Id,
            IdEdificio = usuario.IdEdificio.Value,
            IdCategoriaPublicacion = categoria.IdCategoriaPublicacion,
            Titulo = request.Titulo.Trim(),
            Contenido = request.Contenido.Trim(),
            FechaPublicacion = DateTime.UtcNow,
            FechaLimite = tipo == "encuesta" ? null : fechaLimite,
            Estado = "Publicado",
            Prioritaria = esAdministrador && request.Prioritaria,
            Usuario = usuario,
            CategoriaPublicacion = categoria
        };

        _context.Publicaciones.Add(publicacion);

        await _context.SaveChangesAsync();
        var resultado = MapearPublicacion(publicacion, userId);

        return CreatedAtAction(
            nameof(GetPublicaciones),
            resultado
        );
    }
    // PATCH /publicaciones/{id}/estado
    [HttpPatch("{id:int}/estado")]
    public async Task<IActionResult> CambiarEstado(
        int id,
        [FromBody] CambiarEstadoPublicacionRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var usuario = await _context.Users
            .Include(u => u.Rol)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (usuario == null)
            return Unauthorized();

        var esAdministrador =
            usuario.Rol?.Nombre == "Administrador" ||
            usuario.Rol?.Nombre == "SuperAdministrador";

        if (!esAdministrador)
            return Forbid();

        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");

        var publicacion = await _context.Publicaciones
            .Include(p => p.Encuesta)
            .FirstOrDefaultAsync(p =>
                p.IdPublicacion == id &&
                p.IdEdificio == usuario.IdEdificio.Value);

        if (publicacion == null)
            return NotFound("No se encontró la publicación.");
        var fechaVencimiento =
            publicacion.Encuesta?.FechaFin ??
            publicacion.FechaLimite ??
            publicacion.FechaPublicacion.AddDays(7);

        var encuestaCerrada = publicacion.Encuesta != null &&
            string.Equals(
                publicacion.Encuesta.Estado,
                "Cerrada",
                StringComparison.OrdinalIgnoreCase
            );

        if (request.Activa && encuestaCerrada)
            return BadRequest("No se puede reactivar una encuesta cerrada.");

        if (request.Activa && fechaVencimiento <= DateTime.UtcNow)
            return BadRequest("No se puede reactivar una publicación vencida.");

        publicacion.Estado = request.Activa ? "Publicado" : "Inactivo";

        await _context.SaveChangesAsync();

        return Ok(new
        {
            id = publicacion.IdPublicacion,
            estado = publicacion.Estado,
            activa = request.Activa,
            fechaVencimiento
        });
    }
    // POST /publicaciones/{id}/reacciones
    [HttpPost("{id:int}/reacciones")]
    public async Task<ActionResult<ReaccionResponseDto[]>> AlternarReaccion(
        int id,
        [FromBody] CrearReaccionRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var usuario = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (usuario == null)
            return Unauthorized();

        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");

        if (string.IsNullOrWhiteSpace(request.Emoji))
            return BadRequest("El emoji es obligatorio.");

        var emoji = request.Emoji.Trim();

        var publicacion = await _context.Publicaciones
            .FirstOrDefaultAsync(p =>
                p.IdPublicacion == id &&
                p.IdEdificio == usuario.IdEdificio.Value);

        if (publicacion == null)
            return NotFound("No se encontró la publicación.");

        var reaccionExistente = await _context.ReaccionesPublicacion
            .FirstOrDefaultAsync(r =>
                r.IdPublicacion == id &&
                r.IdUsuario == userId &&
                r.Emoji == emoji);

        if (reaccionExistente != null)
        {
            _context.ReaccionesPublicacion.Remove(reaccionExistente);
        }
        else
        {
            _context.ReaccionesPublicacion.Add(new ReaccionPublicacion
            {
                IdPublicacion = id,
                IdUsuario = userId,
                Emoji = emoji,
                Fecha = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        var reacciones = await _context.ReaccionesPublicacion
            .Where(r => r.IdPublicacion == id)
            .ToListAsync();

        return Ok(AgruparReacciones(reacciones, userId));
    }
    // POST /publicaciones/{id}/comentarios
    [HttpPost("{id:int}/comentarios")]
    public async Task<ActionResult<ComentarioResponseDto>> CrearComentario(
        int id,
        [FromBody] CrearComentarioRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var usuario = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (usuario == null)
            return Unauthorized();

        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");

        if (string.IsNullOrWhiteSpace(request.Contenido))
            return BadRequest("El comentario no puede estar vacío.");

        var publicacion = await _context.Publicaciones
            .FirstOrDefaultAsync(p =>
                p.IdPublicacion == id &&
                p.IdEdificio == usuario.IdEdificio.Value);

        if (publicacion == null)
            return NotFound("No se encontró la publicación.");

        var comentario = new Comentario
        {
            IdPublicacion = publicacion.IdPublicacion,
            IdUsuario = usuario.Id,
            Contenido = request.Contenido.Trim(),
            Fecha = DateTime.UtcNow,
            Publicacion = publicacion,
            Usuario = usuario
        };

        _context.Comentarios.Add(comentario);

        await _context.SaveChangesAsync();

        var resultado = new ComentarioResponseDto(
            comentario.IdComentario,
            $"{usuario.Nombre} {usuario.Apellido}".Trim(),
            comentario.Contenido,
            comentario.Fecha
        );

        return Ok(resultado);
    }
    private static PublicacionResponseDto MapearPublicacion(
    Publicacion publicacion,
    string userId)
    {
        var rol = publicacion.Usuario.Rol?.Nombre;

        var esAdministrador =
            rol == "Administrador" ||
            rol == "SuperAdministrador";

        var tipo = publicacion.CategoriaPublicacion.Nombre.ToLowerInvariant();

        var comentarios = publicacion.Comentarios
            .OrderBy(c => c.Fecha)
            .Select(c => new ComentarioResponseDto(
                c.IdComentario,
                $"{c.Usuario.Nombre} {c.Usuario.Apellido}".Trim(),
                c.Contenido,
                c.Fecha
            ))
            .ToArray();

        var fechaVencimiento =
            publicacion.Encuesta?.FechaFin ??
            publicacion.FechaLimite ??
            publicacion.FechaPublicacion.AddDays(7);

        var encuestaCerrada = publicacion.Encuesta != null &&
     string.Equals(
         publicacion.Encuesta.Estado,
         "Cerrada",
         StringComparison.OrdinalIgnoreCase
     );

        var activa =
            !string.Equals(
                publicacion.Estado,
                "Inactivo",
                StringComparison.OrdinalIgnoreCase
            )
            && !encuestaCerrada
            && fechaVencimiento > DateTime.UtcNow;

        return new PublicacionResponseDto(
            publicacion.IdPublicacion,
            publicacion.Encuesta?.IdEncuesta,
            esAdministrador ? "admin" : "vecino",
            tipo,
            publicacion.Usuario.Id,
            $"{publicacion.Usuario.Nombre} {publicacion.Usuario.Apellido}".Trim(),
            publicacion.Titulo,
            publicacion.Contenido,
            publicacion.FechaPublicacion,
            AgruparReacciones(publicacion.Reacciones, userId),
            comentarios,
            comentarios.Length,
            publicacion.Prioritaria,
            publicacion.Estado,
            publicacion.FechaLimite,
            fechaVencimiento,
            activa
        );
    }
    private static ReaccionResponseDto[] AgruparReacciones(
        IEnumerable<ReaccionPublicacion> reacciones,
        string userId)
    {
        return reacciones
            .GroupBy(r => r.Emoji)
            .Select(grupo => new ReaccionResponseDto(
                grupo.Key,
                grupo.Count(),
                grupo.Any(r => r.IdUsuario == userId)
            ))
            .ToArray();
    }
    private static DateTime? NormalizarFechaLimite(DateTime? fecha)
    {
        if (!fecha.HasValue)
            return null;

        return FechaArgentina.FinDelDiaUtc(fecha.Value);
    }

}

// DTOs

public sealed class CrearPublicacionRequest
{
    public string Titulo { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string Contenido { get; set; } = string.Empty;
    public bool Prioritaria { get; set; }
    public DateTime? FechaLimite { get; set; }
}
public sealed class CambiarEstadoPublicacionRequest
{
    public bool Activa { get; set; }
}
public sealed class CrearComentarioRequest
{
    public string Contenido { get; set; } = string.Empty;
}

public sealed record ComentarioResponseDto(
    int Id,
    string UserName,
    string Content,
    DateTime CreatedAt
);

public sealed class CrearReaccionRequest
{
    public string Emoji { get; set; } = string.Empty;
}

public sealed record ReaccionResponseDto(
    string Emoji,
    int Count,
    bool Reacted
);
public sealed record PublicacionResponseDto(
    int Id,
    int? EncuestaId,
    string AuthorRole,
    string Type,
    string UserId,
    string UserName,
    string Title,
    string Content,
    DateTime CreatedAt,
    ReaccionResponseDto[] Reactions,
    ComentarioResponseDto[] Comments,
    int CommentsCount,
    bool Prioritaria,
    string Estado,
    DateTime? FechaLimite,
    DateTime FechaVencimiento,
    bool Activa
);