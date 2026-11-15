
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.DTOs;
using VecinApp.Models;

namespace VecinApp.Controllers;

[ApiController]
[Route("api/usuarios")]
[Authorize]
public class UsuariosController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<Usuario> _userManager;

    public UsuariosController(
        AppDbContext context,
        UserManager<Usuario> userManager)
    {
        _context = context;
        _userManager = userManager;
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
}
