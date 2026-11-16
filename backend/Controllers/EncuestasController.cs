using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using VecinApp.Data;
using VecinApp.Models;

namespace VecinApp.Controllers;

[ApiController]
[Route("encuestas")]
[Authorize]
public sealed class EncuestasController : ControllerBase
{
    private const string Administrador = "Administrador";
    private const string SuperAdministrador = "SuperAdministrador";
    private const string Propietario = "Propietario";
    private const string Inquilino = "Inquilino";
    private readonly AppDbContext _context;

    public EncuestasController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EncuestaResponseDto>>> ObtenerEncuestas(
        CancellationToken cancellationToken)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync(cancellationToken);
        if (error is not null) return error;
        if (!PuedeConsultar(usuario!.Rol?.Nombre)) return Forbid();
        if (!usuario.IdEdificio.HasValue) return Ok(Array.Empty<EncuestaResponseDto>());

        var encuestas = await _context.Encuestas
            .AsNoTracking()
            .Where(encuesta => encuesta.Publicacion.IdEdificio == usuario.IdEdificio.Value)
            .Include(encuesta => encuesta.Publicacion)
                .ThenInclude(publicacion => publicacion.Usuario)
                    .ThenInclude(autor => autor.Rol)
            .Include(encuesta => encuesta.Opciones)
            .Include(encuesta => encuesta.Respuestas)
            .OrderByDescending(encuesta => encuesta.FechaInicio)
            .ToListAsync(cancellationToken);

        return Ok(encuestas.Select(encuesta => Mapear(encuesta, usuario.Id)));
    }

    [HttpPost]
    public async Task<ActionResult<EncuestaResponseDto>> CrearEncuesta(
        [FromBody] CrearEncuestaRequest request,
        CancellationToken cancellationToken)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync(cancellationToken);
        if (error is not null) return error;
        if (!EsAdministrador(usuario!.Rol?.Nombre)) return Forbid();
        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");

        var opciones = request.Opciones?
            .Select(opcion => opcion?.Trim() ?? string.Empty)
            .Where(opcion => !string.IsNullOrWhiteSpace(opcion))
            .ToArray() ?? [];
        if (string.IsNullOrWhiteSpace(request.Titulo)
            || string.IsNullOrWhiteSpace(request.Descripcion)
            || opciones.Length < 2)
            return BadRequest("El título, la descripción y al menos dos opciones son obligatorios.");

        var fechaInicio = DateTime.UtcNow;
        var fechaFin = NormalizarFechaLimite(request.FechaLimite)
            ?? fechaInicio.AddDays(7);
        if (fechaFin <= fechaInicio)
            return BadRequest("La fecha límite debe ser futura.");

        var categoria = await _context.CategoriasPublicacion
            .FirstOrDefaultAsync(item => item.Nombre.ToLower() == "encuesta", cancellationToken);
        if (categoria is null)
            return Conflict("Falta la categoría encuesta. Aplicá la migración del módulo.");

        var publicacion = new Publicacion
        {
            IdUsuario = usuario.Id,
            IdEdificio = usuario.IdEdificio.Value,
            CategoriaPublicacion = categoria,
            Titulo = request.Titulo.Trim(),
            Contenido = request.Descripcion.Trim(),
            FechaPublicacion = fechaInicio,
            FechaLimite = fechaFin,
            Estado = "Publicado",
            Prioritaria = request.Prioritaria,
            ComentariosActivos = request.ComentariosActivos,
            Usuario = usuario
        };
        var encuesta = new Encuesta
        {
            Publicacion = publicacion,
            FechaInicio = fechaInicio,
            FechaFin = fechaFin,
            Estado = "EnProceso",
            Opciones = opciones.Select(texto => new OpcionEncuesta { Texto = texto }).ToList()
        };
        _context.Encuestas.Add(encuesta);
        await _context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(ObtenerEncuestas), Mapear(encuesta, usuario.Id));
    }

    [HttpPost("{id:int}/votos")]
    public async Task<ActionResult<EncuestaResponseDto>> RegistrarVoto(
        int id,
        [FromBody] RegistrarVotoEncuestaRequest request,
        CancellationToken cancellationToken)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync(cancellationToken);
        if (error is not null) return error;
        if (!EsResidente(usuario!.Rol?.Nombre)) return Forbid();
        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");

        var encuesta = await _context.Encuestas
            .Include(item => item.Publicacion)
            .Include(item => item.Opciones)
            .Include(item => item.Respuestas)
            .FirstOrDefaultAsync(
                item => item.IdEncuesta == id
                    && item.Publicacion.IdEdificio == usuario.IdEdificio.Value,
                cancellationToken);
        if (encuesta is null) return NotFound("No se encontró la encuesta.");
        if (!PuedeVotarse(encuesta))
            return Conflict("La encuesta está cerrada o vencida.");
        if (!encuesta.Opciones.Any(opcion => opcion.IdOpcion == request.IdOpcion))
            return BadRequest("La opción no pertenece a esta encuesta.");
        if (encuesta.Respuestas.Any(respuesta => respuesta.IdUsuario == usuario.Id))
            return Conflict("Ya registraste un voto en esta encuesta.");

        _context.RespuestasEncuesta.Add(new RespuestaEncuesta
        {
            IdEncuesta = encuesta.IdEncuesta,
            IdOpcion = request.IdOpcion,
            IdUsuario = usuario.Id,
            FechaRespuesta = DateTime.UtcNow
        });

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (EsViolacionUnicidad(exception))
        {
            return Conflict("Ya registraste un voto en esta encuesta.");
        }

        if (!encuesta.Respuestas.Any(respuesta => respuesta.IdUsuario == usuario.Id))
        {
            encuesta.Respuestas.Add(new RespuestaEncuesta
            {
                IdEncuesta = encuesta.IdEncuesta,
                IdOpcion = request.IdOpcion,
                IdUsuario = usuario.Id
            });
        }
        return Ok(Mapear(encuesta, usuario.Id));
    }

    [HttpGet("{id:int}/votantes")]
    public async Task<ActionResult<EncuestaVotantesResponseDto>> ObtenerVotantes(
        int id,
        CancellationToken cancellationToken)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync(cancellationToken);
        if (error is not null) return error;
        if (!EsAdministrador(usuario!.Rol?.Nombre)) return Forbid();
        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");

        var encuesta = await _context.Encuestas
            .AsNoTracking()
            .Where(item => item.IdEncuesta == id
                && item.Publicacion.IdEdificio == usuario.IdEdificio.Value)
            .Include(item => item.Publicacion)
            .Include(item => item.Respuestas)
                .ThenInclude(respuesta => respuesta.Usuario)
            .Include(item => item.Respuestas)
                .ThenInclude(respuesta => respuesta.Opcion)
            .FirstOrDefaultAsync(cancellationToken);

        if (encuesta is null) return NotFound("No se encontró la encuesta.");

        var votantes = encuesta.Respuestas
            .OrderBy(respuesta => respuesta.FechaRespuesta)
            .ThenBy(respuesta => respuesta.IdRespuesta)
            .Select(respuesta => new VotanteEncuestaResponseDto(
                $"{respuesta.Usuario.Nombre} {respuesta.Usuario.Apellido}".Trim(),
                respuesta.Opcion.Texto,
                respuesta.FechaRespuesta))
            .ToArray();

        return Ok(new EncuestaVotantesResponseDto(
            encuesta.IdEncuesta,
            encuesta.Publicacion.Titulo,
            PuedeVotarse(encuesta) ? "en-proceso" : "cerrada",
            encuesta.FechaFin,
            votantes.Length,
            votantes));
    }

    [HttpPatch("{id:int}/cerrar")]
    public async Task<IActionResult> CerrarEncuesta(
        int id,
        CancellationToken cancellationToken)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync(cancellationToken);
        if (error is not null) return error;
        if (!EsAdministrador(usuario!.Rol?.Nombre)) return Forbid();
        if (!usuario.IdEdificio.HasValue)
            return BadRequest("El usuario no tiene un edificio asignado.");

        var encuesta = await _context.Encuestas
            .FirstOrDefaultAsync(
                item => item.IdEncuesta == id
                    && item.Publicacion.IdEdificio == usuario.IdEdificio.Value,
                cancellationToken);
        if (encuesta is null) return NotFound("No se encontró la encuesta.");

        encuesta.Estado = "Cerrada";
        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<(Usuario? Usuario, ActionResult? Error)> ObtenerUsuarioActualAsync(
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return (null, Unauthorized());

        var usuario = await _context.Users
            .Include(item => item.Rol)
            .FirstOrDefaultAsync(item => item.Id == userId, cancellationToken);
        if (usuario is null) return (null, Unauthorized());
        if (usuario.Estado != EstadoUsuario.Activo) return (null, Forbid());
        return (usuario, null);
    }

    private static bool PuedeConsultar(string? rol) =>
        EsAdministrador(rol) || EsResidente(rol);

    private static bool EsAdministrador(string? rol) =>
        rol is Administrador or SuperAdministrador;

    private static bool EsResidente(string? rol) =>
        rol is Propietario or Inquilino;

    private static bool PuedeVotarse(Encuesta encuesta) =>
        string.Equals(encuesta.Estado, "EnProceso", StringComparison.OrdinalIgnoreCase)
        && encuesta.FechaFin > DateTime.UtcNow;

    private static EncuestaResponseDto Mapear(Encuesta encuesta, string userId)
    {
        var conteos = encuesta.Respuestas
            .GroupBy(respuesta => respuesta.IdOpcion)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.Count());
        var votoUsuario = encuesta.Respuestas
            .FirstOrDefault(respuesta => respuesta.IdUsuario == userId);
        var abierta = PuedeVotarse(encuesta);

        return new EncuestaResponseDto(
            encuesta.IdEncuesta,
            encuesta.IdPublicacion,
            encuesta.Publicacion.Titulo,
            encuesta.Publicacion.Contenido,
            encuesta.Opciones.OrderBy(opcion => opcion.IdOpcion)
                .Select(opcion => new OpcionEncuestaResponseDto(
                    opcion.IdOpcion, opcion.Texto, conteos.GetValueOrDefault(opcion.IdOpcion)))
                .ToArray(),
            abierta,
            encuesta.Publicacion.ComentariosActivos,
            encuesta.Publicacion.Prioritaria,
            encuesta.FechaFin,
            encuesta.FechaInicio,
            abierta ? "en-proceso" : "cerrada",
            encuesta.Respuestas.Count,
            votoUsuario is not null,
            votoUsuario?.IdOpcion);
    }

    private static DateTime? NormalizarFechaLimite(DateTime? fecha)
    {
        if (!fecha.HasValue) return null;
        var zonaHoraria = TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires");
        var inicioDiaSiguiente = DateTime.SpecifyKind(fecha.Value.Date.AddDays(1), DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(inicioDiaSiguiente, zonaHoraria).AddTicks(-1);
    }

    private static bool EsViolacionUnicidad(Exception exception)
    {
        for (Exception? actual = exception; actual is not null; actual = actual.InnerException)
            if (actual is PostgresException postgres
                && postgres.SqlState == PostgresErrorCodes.UniqueViolation)
                return true;
        return false;
    }
}

public sealed class CrearEncuestaRequest
{
    public string Titulo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string[] Opciones { get; set; } = [];
    public bool ComentariosActivos { get; set; } = true;
    public bool Prioritaria { get; set; }
    public DateTime? FechaLimite { get; set; }
}

public sealed class RegistrarVotoEncuestaRequest
{
    public int IdOpcion { get; set; }
}

public sealed record OpcionEncuestaResponseDto(int Id, string Texto, int Votos);

public sealed record EncuestaResponseDto(
    int Id,
    int IdPublicacion,
    string Titulo,
    string Descripcion,
    OpcionEncuestaResponseDto[] Opciones,
    bool VotacionActiva,
    bool ComentariosActivos,
    bool Prioritaria,
    DateTime FechaLimite,
    DateTime FechaPublicacion,
    string Estado,
    int TotalVotos,
    bool YaVote,
    int? MiOpcionId);

public sealed record VotanteEncuestaResponseDto(
    string Nombre,
    string Opcion,
    DateTime FechaVoto);

public sealed record EncuestaVotantesResponseDto(
    int EncuestaId,
    string Titulo,
    string Estado,
    DateTime FechaLimite,
    int TotalVotos,
    VotanteEncuestaResponseDto[] Votantes);
