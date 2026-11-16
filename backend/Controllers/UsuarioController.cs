
using System.ComponentModel.DataAnnotations;
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
[Route("api/usuarios")]
[Authorize]
public class UsuariosController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<Usuario> _userManager;
    private readonly VinculacionesService? _vinculacionesService;

    public UsuariosController(
        AppDbContext context,
        UserManager<Usuario> userManager,
        VinculacionesService? vinculacionesService = null)
    {
        _context = context;
        _userManager = userManager;
        _vinculacionesService = vinculacionesService;
    }

    // GET /api/usuarios/comunidad
    [HttpGet("comunidad")]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult<IReadOnlyList<UsuarioComunidadDto>>> ObtenerPersonasComunidad()
    {
        var usuario = await _userManager.GetUserAsync(User);

        if (usuario == null)
            return Unauthorized();

        if (usuario.Estado != EstadoUsuario.Activo)
            return Forbid();

        if (!usuario.IdEdificio.HasValue)
            return BadRequest(new { message = "El administrador no tiene un edificio asignado." });

        var idEdificio = usuario.IdEdificio.Value;
        var rolesComunitarios = new[] { "Inquilino", "Propietario", "Portero" };

        var personas = await _context.Users
            .AsNoTracking()
            .Where(persona =>
                persona.IdEdificio == idEdificio &&
                persona.Rol != null &&
                rolesComunitarios.Contains(persona.Rol.Nombre))
            .OrderBy(persona => persona.Apellido)
            .ThenBy(persona => persona.Nombre)
            .Select(persona => new UsuarioComunidadDto(
                persona.Id,
                persona.Nombre,
                persona.Apellido,
                persona.Email ?? string.Empty,
                persona.Rol!.Nombre,
                persona.Estado.ToString(),
                persona.FechaRegistro,
                _context.RegistrosComunitarios
                    .Where(registro => registro.IdUsuario == persona.Id)
                    .Select(registro => registro.Perfil)
                    .FirstOrDefault(),
                _context.DeclaracionesUnidadesComunitarias
                    .Where(declaracion =>
                        declaracion.IdUsuario == persona.Id &&
                        declaracion.IdEdificio == idEdificio)
                    .OrderBy(declaracion => declaracion.FechaDeclaracion)
                    .Select(declaracion => new UnidadDeclaradaDto(
                        declaracion.Tipo,
                        declaracion.PisoDeclarado,
                        declaracion.IdentificacionDeclarada,
                        declaracion.EsPrincipal,
                        declaracion.EstaAlquilada,
                        declaracion.EstadoConfirmacion,
                        declaracion.FechaDeclaracion))
                    .ToList()))
            .ToListAsync();

        return Ok(personas);
    }

    // GET /api/usuarios/me/unidades
    [HttpGet("me/unidades")]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<IActionResult> ObtenerMisUnidades()
    {
        var usuario = await _userManager.GetUserAsync(User);

        if (usuario == null)
            return Unauthorized();

        if (usuario.Estado != EstadoUsuario.Activo)
            return Forbid();

        var unidades = await _context.UsuariosUnidades
            .AsNoTracking()
            .Where(uu => uu.IdUsuario == usuario.Id)
            .Select(uu => new
            {
                id = uu.Unidad.IdUnidad,
                piso = uu.Unidad.Piso,
                identificacion = uu.Unidad.Identificacion,
                edificioId = uu.Unidad.IdEdificio,
                edificioNombre = uu.Unidad.Edificio.Nombre,
                tipoRelacion = uu.TipoRelacion
            })
            .ToListAsync();

        return Ok(unidades);
    }

    // GET /api/usuarios/me/perfil
    [HttpGet("me/perfil")]
    [Authorize(Roles = "Administrador,SuperAdministrador,Inquilino,Propietario,Portero")]
    public async Task<ActionResult<PerfilUsuarioDto>> ObtenerMiPerfil(CancellationToken ct)
    {
        var usuario = await _userManager.GetUserAsync(User);
        if (usuario == null)
            return Unauthorized();
        if (usuario.Estado != EstadoUsuario.Activo)
            return Forbid();

        return Ok(await CrearPerfilDtoAsync(usuario, ct));
    }

    // PUT /api/usuarios/me/perfil
    [HttpPut("me/perfil")]
    [Authorize(Roles = "Administrador,SuperAdministrador,Inquilino,Propietario,Portero")]
    public async Task<ActionResult<PerfilUsuarioDto>> ActualizarMiPerfil(
        [FromBody] ActualizarPerfilRequest request,
        CancellationToken ct)
    {
        var usuario = await _userManager.GetUserAsync(User);
        if (usuario == null)
            return Unauthorized();
        if (usuario.Estado != EstadoUsuario.Activo)
            return Forbid();

        var errores = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.Nombre))
            errores[nameof(request.Nombre)] = ["El nombre es obligatorio."];
        else if (request.Nombre.Trim().Length > 100)
            errores[nameof(request.Nombre)] = ["El nombre no puede superar los 100 caracteres."];

        if (string.IsNullOrWhiteSpace(request.Apellido))
            errores[nameof(request.Apellido)] = ["El apellido es obligatorio."];
        else if (request.Apellido.Trim().Length > 100)
            errores[nameof(request.Apellido)] = ["El apellido no puede superar los 100 caracteres."];

        var telefono = string.IsNullOrWhiteSpace(request.Telefono) ? null : request.Telefono.Trim();
        if (telefono?.Length > 30)
            errores[nameof(request.Telefono)] = ["El teléfono no puede superar los 30 caracteres."];
        else if (telefono is not null && !new PhoneAttribute().IsValid(telefono))
            errores[nameof(request.Telefono)] = ["Ingresá un teléfono válido."];

        if (errores.Count > 0)
            return BadRequest(new ValidationProblemDetails(errores));

        usuario.Nombre = request.Nombre.Trim();
        usuario.Apellido = request.Apellido.Trim();
        usuario.PhoneNumber = telefono;
        usuario.ConcurrencyStamp = Guid.NewGuid().ToString();

        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "El perfil cambió mientras se guardaban los datos. Volvé a cargarlo e intentá nuevamente." });
        }
        catch (DbUpdateException)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "No se pudieron guardar los cambios del perfil." });
        }

        if (_vinculacionesService != null)
            await _vinculacionesService.EvaluarAsync(usuario.Id, ct);

        return Ok(await CrearPerfilDtoAsync(usuario, ct));
    }

    private async Task<PerfilUsuarioDto> CrearPerfilDtoAsync(Usuario usuario, CancellationToken ct)
    {
        var rol = usuario.IdRol.HasValue
            ? await _context.RolesAplicacion
                .Where(item => item.IdRol == usuario.IdRol.Value)
                .Select(item => item.Nombre)
                .FirstOrDefaultAsync(ct)
            : null;
        var edificioNombre = usuario.IdEdificio.HasValue
            ? await _context.Edificios
                .Where(item => item.IdEdificio == usuario.IdEdificio.Value)
                .Select(item => item.Nombre)
                .FirstOrDefaultAsync(ct)
            : null;
        var unidadesVinculadas = await _context.UsuariosUnidades
            .AsNoTracking()
            .Where(relacion => relacion.IdUsuario == usuario.Id)
            .OrderBy(relacion => relacion.Unidad.Piso)
            .ThenBy(relacion => relacion.Unidad.Identificacion)
            .Select(relacion => new UnidadVinculadaPerfilDto(
                relacion.Unidad.IdUnidad,
                relacion.Unidad.Piso,
                relacion.Unidad.Identificacion,
                relacion.Unidad.Edificio.Nombre,
                relacion.TipoRelacion))
            .ToListAsync(ct);
        var unidadesDeclaradas = await _context.DeclaracionesUnidadesComunitarias
            .AsNoTracking()
            .Where(declaracion => declaracion.IdUsuario == usuario.Id)
            .OrderBy(declaracion => declaracion.FechaDeclaracion)
            .Select(declaracion => new UnidadDeclaradaPerfilDto(
                declaracion.IdDeclaracionUnidad,
                declaracion.Tipo,
                declaracion.PisoDeclarado,
                declaracion.IdentificacionDeclarada,
                declaracion.EsPrincipal,
                declaracion.EstaAlquilada,
                declaracion.EstadoConfirmacion,
                declaracion.FechaDeclaracion,
                declaracion.PersonaRelacionNombre,
                declaracion.PersonaRelacionApellido,
                declaracion.PisoRelacion,
                declaracion.IdentificacionRelacion))
            .ToListAsync(ct);
        var registro = await _context.RegistrosComunitarios
            .AsNoTracking()
            .Where(item => item.IdUsuario == usuario.Id)
            .Select(item => new
            {
                item.ViveEnEdificio,
                item.TieneOtrasUnidades,
                item.DeclaraUnidadesAlquiladas,
                item.ModalidadAlquiler,
                item.FuncionPersonal,
                item.FuncionPersonalOtra,
                item.HorarioPersonal
            })
            .FirstOrDefaultAsync(ct);

        return new PerfilUsuarioDto(
            usuario.Nombre,
            usuario.Apellido,
            usuario.Email ?? string.Empty,
            usuario.PhoneNumber,
            rol ?? string.Empty,
            edificioNombre,
            unidadesVinculadas,
            unidadesDeclaradas,
            registro?.ViveEnEdificio,
            registro?.TieneOtrasUnidades,
            registro?.DeclaraUnidadesAlquiladas,
            registro?.ModalidadAlquiler,
            registro?.FuncionPersonal,
            registro?.FuncionPersonalOtra,
            registro?.HorarioPersonal);
    }
}
