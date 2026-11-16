using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using VecinApp.Data;
using VecinApp.Models;

namespace VecinApp.Controllers;

[ApiController]
[Route("publicaciones")]
[Authorize]
public sealed class PublicacionesController : ControllerBase
{
    private const string RolAdministrador = "Administrador";
    private const string RolSuperAdministrador = "SuperAdministrador";
    private const string RolPropietario = "Propietario";
    private const string RolInquilino = "Inquilino";

    private readonly AppDbContext _context;

    public PublicacionesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PublicacionResponseDto>>> GetPublicaciones(
        CancellationToken cancellationToken)
    {
        var (usuario, cuentaInactiva) = await ObtenerUsuarioActualAsync(cancellationToken);
        if (usuario is null)
            return cuentaInactiva ? Forbid() : Unauthorized();
        if (!PuedeAccederAComunidad(usuario.Rol?.Nombre))
            return Forbid();
        if (!usuario.IdEdificio.HasValue)
            return Ok(Array.Empty<PublicacionResponseDto>());

        var publicaciones = await _context.Publicaciones
            .AsNoTracking()
            .Where(publicacion => publicacion.IdEdificio == usuario.IdEdificio.Value)
            .Include(publicacion => publicacion.Usuario)
                .ThenInclude(autor => autor.Rol)
            .Include(publicacion => publicacion.CategoriaPublicacion)
            .Include(publicacion => publicacion.Comentarios)
                .ThenInclude(comentario => comentario.Usuario)
            .Include(publicacion => publicacion.Reacciones)
            .Include(publicacion => publicacion.Encuesta)
            .OrderByDescending(publicacion => publicacion.FechaPublicacion)
            .ToListAsync(cancellationToken);

        return Ok(publicaciones.Select(publicacion => MapearPublicacion(publicacion, usuario.Id)));
    }

    [HttpPost]
    public async Task<ActionResult<PublicacionResponseDto>> CrearPublicacion(
        [FromBody] CrearPublicacionRequest request,
        CancellationToken cancellationToken)
    {
        var (usuario, cuentaInactiva) = await ObtenerUsuarioActualAsync(cancellationToken);
        if (usuario is null)
            return cuentaInactiva ? Forbid() : Unauthorized();
        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");

        var tipo = request.Tipo?.Trim().ToLowerInvariant();
        var rol = usuario.Rol?.Nombre;
        var esAdministrador = EsAdministrador(rol);
        var esResidente = rol is RolPropietario or RolInquilino;

        if (tipo == "encuesta")
            return BadRequest("Las encuestas deben crearse desde el módulo de Encuestas.");
        if (tipo == "publicacion" && !esResidente)
            return Forbid();
        if (tipo == "aviso" && !esAdministrador)
            return Forbid();
        if (tipo is not ("publicacion" or "aviso"))
            return BadRequest("El tipo de publicación no es válido.");
        if (string.IsNullOrWhiteSpace(request.Titulo))
            return BadRequest("El título es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.Contenido))
            return BadRequest("El contenido es obligatorio.");
        if (request.Prioritaria && !esAdministrador)
            return Forbid();
        if (request.ComentariosActivos == false && !esAdministrador)
            return Forbid();

        var fechaLimite = NormalizarFechaLimite(request.FechaLimite);
        if (fechaLimite.HasValue && fechaLimite.Value <= DateTime.UtcNow)
            return BadRequest("La fecha de vencimiento debe ser futura.");

        var categoria = await _context.CategoriasPublicacion
            .FirstOrDefaultAsync(item => item.Nombre.ToLower() == tipo, cancellationToken);
        if (categoria is null)
            return Conflict("Falta la categoría requerida para publicaciones. Aplicá la migración del módulo.");

        var publicacion = new Publicacion
        {
            IdUsuario = usuario.Id,
            IdEdificio = usuario.IdEdificio.Value,
            IdCategoriaPublicacion = categoria.IdCategoriaPublicacion,
            Titulo = request.Titulo.Trim(),
            Contenido = request.Contenido.Trim(),
            FechaPublicacion = DateTime.UtcNow,
            FechaLimite = fechaLimite,
            Estado = "Publicado",
            Prioritaria = esAdministrador && request.Prioritaria,
            ComentariosActivos = request.ComentariosActivos ?? true,
            Usuario = usuario,
            CategoriaPublicacion = categoria
        };

        _context.Publicaciones.Add(publicacion);
        await _context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetPublicaciones), MapearPublicacion(publicacion, usuario.Id));
    }

    [HttpPatch("{id:int}/estado")]
    public async Task<IActionResult> CambiarEstado(
        int id,
        [FromBody] CambiarEstadoPublicacionRequest request,
        CancellationToken cancellationToken)
    {
        var (usuario, cuentaInactiva) = await ObtenerUsuarioActualAsync(cancellationToken);
        if (usuario is null)
            return cuentaInactiva ? Forbid() : Unauthorized();
        if (!EsAdministrador(usuario.Rol?.Nombre))
            return Forbid();
        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");

        var publicacion = await _context.Publicaciones
            .Include(item => item.Encuesta)
            .FirstOrDefaultAsync(
                item => item.IdPublicacion == id && item.IdEdificio == usuario.IdEdificio.Value,
                cancellationToken);
        if (publicacion is null)
            return NotFound("No se encontró la publicación.");

        var fechaVencimiento = ObtenerFechaVencimiento(publicacion);
        if (request.Activa && EsEncuestaCerrada(publicacion))
            return BadRequest("No se puede reactivar una encuesta cerrada.");
        if (request.Activa && fechaVencimiento <= DateTime.UtcNow)
            return BadRequest("No se puede reactivar una publicación vencida.");

        publicacion.Estado = request.Activa ? "Publicado" : "Inactivo";
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            id = publicacion.IdPublicacion,
            estado = publicacion.Estado,
            activa = request.Activa,
            fechaVencimiento
        });
    }

    [HttpPost("{id:int}/comentarios")]
    public async Task<ActionResult<ComentarioResponseDto>> CrearComentario(
        int id,
        [FromBody] CrearComentarioRequest request,
        CancellationToken cancellationToken)
    {
        var (usuario, cuentaInactiva) = await ObtenerUsuarioActualAsync(cancellationToken);
        if (usuario is null)
            return cuentaInactiva ? Forbid() : Unauthorized();
        if (!PuedeAccederAComunidad(usuario.Rol?.Nombre))
            return Forbid();
        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");
        if (string.IsNullOrWhiteSpace(request.Contenido))
            return BadRequest("El comentario no puede estar vacío.");

        var publicacion = await _context.Publicaciones
            .Include(item => item.Encuesta)
            .FirstOrDefaultAsync(
                item => item.IdPublicacion == id && item.IdEdificio == usuario.IdEdificio.Value,
                cancellationToken);
        if (publicacion is null)
            return NotFound("No se encontró la publicación.");
        if (!publicacion.ComentariosActivos)
            return Conflict("Los comentarios están desactivados para esta publicación.");
        if (!EstaActiva(publicacion))
            return Conflict("No se puede comentar una publicación inactiva, cerrada o vencida.");

        var comentario = new Comentario
        {
            IdPublicacion = publicacion.IdPublicacion,
            IdUsuario = usuario.Id,
            Contenido = request.Contenido.Trim(),
            Fecha = DateTime.UtcNow
        };
        _context.Comentarios.Add(comentario);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new ComentarioResponseDto(
            comentario.IdComentario,
            $"{usuario.Nombre} {usuario.Apellido}".Trim(),
            comentario.Contenido,
            comentario.Fecha));
    }

    [HttpPost("{id:int}/reacciones")]
    public async Task<ActionResult<IReadOnlyList<ReaccionResponseDto>>> AlternarReaccion(
        int id,
        [FromBody] CrearReaccionRequest request,
        CancellationToken cancellationToken)
    {
        var (usuario, cuentaInactiva) = await ObtenerUsuarioActualAsync(cancellationToken);
        if (usuario is null)
            return cuentaInactiva ? Forbid() : Unauthorized();
        if (!PuedeAccederAComunidad(usuario.Rol?.Nombre))
            return Forbid();
        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");
        if (string.IsNullOrWhiteSpace(request.Emoji))
            return BadRequest("El emoji es obligatorio.");

        var emoji = request.Emoji.Trim();
        if (emoji.Length > 20)
            return BadRequest("El emoji no puede superar 20 caracteres.");

        for (var intento = 0; intento < 3; intento++)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            try
            {
                var publicacion = await _context.Publicaciones
                    .Include(item => item.Encuesta)
                    .FirstOrDefaultAsync(
                        item => item.IdPublicacion == id && item.IdEdificio == usuario.IdEdificio.Value,
                        cancellationToken);
                if (publicacion is null)
                    return NotFound("No se encontró la publicación.");
                if (!EstaActiva(publicacion))
                    return Conflict("No se puede reaccionar a una publicación inactiva, cerrada o vencida.");

                var reaccion = await _context.ReaccionesPublicacion.FirstOrDefaultAsync(
                    item => item.IdPublicacion == id
                        && item.IdUsuario == usuario.Id
                        && item.Emoji == emoji,
                    cancellationToken);

                if (reaccion is null)
                {
                    _context.ReaccionesPublicacion.Add(new ReaccionPublicacion
                    {
                        IdPublicacion = id,
                        IdUsuario = usuario.Id,
                        Emoji = emoji,
                        Fecha = DateTime.UtcNow
                    });
                }
                else
                {
                    _context.ReaccionesPublicacion.Remove(reaccion);
                }

                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                var reacciones = await _context.ReaccionesPublicacion
                    .AsNoTracking()
                    .Where(item => item.IdPublicacion == id)
                    .ToListAsync(cancellationToken);
                return Ok(AgruparReacciones(reacciones, usuario.Id));
            }
            catch (Exception exception) when (EsConflictoDeConcurrencia(exception))
            {
                await transaction.RollbackAsync(cancellationToken);
                _context.ChangeTracker.Clear();
                if (intento == 2)
                    return Conflict("No se pudo actualizar la reacción por una operación concurrente. Reintentá.");
            }
        }

        return Conflict("No se pudo actualizar la reacción. Reintentá.");
    }

    private async Task<(Usuario? Usuario, bool CuentaInactiva)> ObtenerUsuarioActualAsync(
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return (null, false);

        var usuario = await _context.Users
            .Include(usuario => usuario.Rol)
            .FirstOrDefaultAsync(usuario => usuario.Id == userId, cancellationToken);

        if (usuario is null)
            return (null, false);
        if (usuario.Estado != EstadoUsuario.Activo)
            return (null, true);

        return (usuario, false);
    }

    private static bool PuedeAccederAComunidad(string? rol) =>
        EsAdministrador(rol) || rol is RolPropietario or RolInquilino;

    private static bool EsAdministrador(string? rol) =>
        rol is RolAdministrador or RolSuperAdministrador;

    private static bool EstaActiva(Publicacion publicacion) =>
        string.Equals(publicacion.Estado, "Publicado", StringComparison.OrdinalIgnoreCase)
        && !EsEncuestaCerrada(publicacion)
        && ObtenerFechaVencimiento(publicacion) > DateTime.UtcNow;

    private static bool EsEncuestaCerrada(Publicacion publicacion) =>
        publicacion.Encuesta is not null
        && string.Equals(publicacion.Encuesta.Estado, "Cerrada", StringComparison.OrdinalIgnoreCase);

    private static DateTime ObtenerFechaVencimiento(Publicacion publicacion) =>
        publicacion.Encuesta?.FechaFin
        ?? publicacion.FechaLimite
        ?? publicacion.FechaPublicacion.AddDays(7);

    private static PublicacionResponseDto MapearPublicacion(Publicacion publicacion, string userId)
    {
        var comentarios = publicacion.Comentarios
            .OrderBy(comentario => comentario.Fecha)
            .Select(comentario => new ComentarioResponseDto(
                comentario.IdComentario,
                $"{comentario.Usuario.Nombre} {comentario.Usuario.Apellido}".Trim(),
                comentario.Contenido,
                comentario.Fecha))
            .ToArray();

        return new PublicacionResponseDto(
            publicacion.IdPublicacion,
            publicacion.Encuesta?.IdEncuesta,
            EsAdministrador(publicacion.Usuario.Rol?.Nombre) ? "admin" : "vecino",
            publicacion.CategoriaPublicacion.Nombre.ToLowerInvariant(),
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
            ObtenerFechaVencimiento(publicacion),
            publicacion.ComentariosActivos,
            EstaActiva(publicacion));
    }

    private static ReaccionResponseDto[] AgruparReacciones(
        IEnumerable<ReaccionPublicacion> reacciones,
        string userId) =>
        reacciones
            .GroupBy(reaccion => reaccion.Emoji)
            .Select(grupo => new ReaccionResponseDto(
                grupo.Key,
                grupo.Count(),
                grupo.Any(reaccion => reaccion.IdUsuario == userId)))
            .ToArray();

    private static DateTime? NormalizarFechaLimite(DateTime? fecha)
    {
        if (!fecha.HasValue)
            return null;

        TimeZoneInfo zonaHoraria;
        try
        {
            zonaHoraria = TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires");
        }
        catch (TimeZoneNotFoundException)
        {
            zonaHoraria = TimeZoneInfo.FindSystemTimeZoneById("Argentina Standard Time");
        }

        var inicioDelDiaSiguiente = DateTime.SpecifyKind(
            fecha.Value.Date.AddDays(1),
            DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(inicioDelDiaSiguiente, zonaHoraria).AddTicks(-1);
    }

    private static bool EsConflictoDeConcurrencia(Exception exception)
    {
        for (Exception? actual = exception; actual is not null; actual = actual.InnerException)
        {
            if (actual is DbUpdateConcurrencyException)
                return true;
            if (actual is PostgresException postgres
                && postgres.SqlState is PostgresErrorCodes.UniqueViolation or PostgresErrorCodes.SerializationFailure)
                return true;
        }

        return false;
    }
}

public sealed class CrearPublicacionRequest
{
    public string Titulo { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string Contenido { get; set; } = string.Empty;
    public bool Prioritaria { get; set; }
    public DateTime? FechaLimite { get; set; }
    public bool? ComentariosActivos { get; set; }
}

public sealed class CambiarEstadoPublicacionRequest
{
    public bool Activa { get; set; }
}

public sealed class CrearComentarioRequest
{
    public string Contenido { get; set; } = string.Empty;
}

public sealed class CrearReaccionRequest
{
    public string Emoji { get; set; } = string.Empty;
}

public sealed record ComentarioResponseDto(int Id, string UserName, string Content, DateTime CreatedAt);
public sealed record ReaccionResponseDto(string Emoji, int Count, bool Reacted);

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
    bool ComentariosActivos,
    bool Activa);
