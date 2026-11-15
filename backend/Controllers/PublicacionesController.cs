
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.Models;

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
    .Include(p => p.Encuesta)
    .OrderByDescending(p => p.FechaPublicacion)
    .ToListAsync();

        var resultado = publicaciones.Select(MapearPublicacion).ToList();

        return Ok(resultado);
    }

    // POST /publicaciones
    [HttpPost]
    public async Task<ActionResult<PublicacionResponseDto>> CrearPublicacion(
        [FromBody] CrearPublicacionRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

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

        var categoria = await _context.CategoriasPublicacion
            .FirstOrDefaultAsync(c => c.Nombre.ToLower() == tipo);

        if (categoria == null)
            return BadRequest("No se encontró la categoría de publicación.");

        var publicacion = new Publicacion
        {
            IdUsuario = usuario.Id,
            IdEdificio = usuario.IdEdificio.Value,
            IdCategoriaPublicacion = categoria.IdCategoriaPublicacion,
            Titulo = tipo switch
            {
                "aviso" => "Aviso",
                "encuesta" => "Encuesta",
                _ => "Publicación"
            },
            Contenido = request.Contenido.Trim(),
            FechaPublicacion = DateTime.UtcNow,
            Estado = "Publicado",
            Usuario = usuario,
            CategoriaPublicacion = categoria
        };

        _context.Publicaciones.Add(publicacion);

        await _context.SaveChangesAsync();

        var resultado = MapearPublicacion(publicacion);

        return CreatedAtAction(
            nameof(GetPublicaciones),
            resultado
        );
    }

    private static PublicacionResponseDto MapearPublicacion(
        Publicacion publicacion)
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
      Array.Empty<object>(),
      comentarios,
      comentarios.Length
  );
    }
}

public sealed class CrearPublicacionRequest
{
    public string Tipo { get; set; } = string.Empty;
    public string Contenido { get; set; } = string.Empty;
}

public sealed record ComentarioResponseDto(
    int Id,
    string UserName,
    string Content,
    DateTime CreatedAt
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
    object[] Reactions,
    ComentarioResponseDto[] Comments,
    int CommentsCount
);
