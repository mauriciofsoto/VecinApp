
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
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

    // GET /api/usuarios/edificio
    // Administrador: consulta su propio edificio.
    // SuperAdministrador: consulta el edificio indicado.
    [HttpGet("edificio")]
    [Authorize(Roles = "Administrador,SuperAdministrador")]
    public async Task<IActionResult> ObtenerUsuariosEdificio(
        [FromQuery] int? idEdificio)
    {
        var usuarioActual = await _userManager.GetUserAsync(User);

        if (usuarioActual == null)
            return Unauthorized();

        int edificioId;

        if (User.IsInRole("Administrador"))
        {
            if (usuarioActual.IdEdificio == null)
                return BadRequest(new
                {
                    message = "El administrador no tiene un edificio asignado."
                });

            // El administrador siempre consulta su propio edificio.
            edificioId = usuarioActual.IdEdificio.Value;
        }
        else
        {
            if (!idEdificio.HasValue || idEdificio.Value <= 0)
                return BadRequest(new
                {
                    message = "Debe indicar un edificio válido."
                });

            edificioId = idEdificio.Value;
        }

        var edificioExiste = await _context.Edificios
            .AnyAsync(e => e.IdEdificio == edificioId);

        if (!edificioExiste)
            return NotFound(new
            {
                message = "No se encontró el edificio."
            });

        var usuarios = await _userManager.Users
            .AsNoTracking()
            .Where(u =>
                u.IdEdificio == edificioId &&
                (u.Rol == null || u.Rol.Nombre != "SuperAdministrador"))
            .Select(u => new
            {
                id = u.Id,
                nombre = u.Nombre,
                apellido = u.Apellido,
                email = u.Email,
                rol = u.Rol != null ? u.Rol.Nombre : "Sin rol",
                estado = u.Estado.ToString(),
                fechaRegistro = u.FechaRegistro,
                edificioId = u.IdEdificio,
                edificioNombre = u.Edificio != null
                    ? u.Edificio.Nombre
                    : "",
                unidades = u.UsuariosUnidades
                    .Select(uu => new
                    {
                        id = uu.Unidad.IdUnidad,
                        piso = uu.Unidad.Piso,
                        identificacion = uu.Unidad.Identificacion,
                        tipoRelacion = uu.TipoRelacion
                    })
                    .ToList()
            })
            .OrderBy(u => u.apellido)
            .ThenBy(u => u.nombre)
            .ToListAsync();

        return Ok(usuarios);
    }

    // PATCH /api/usuarios/{id}/estado
    [HttpPatch("{id}/estado")]
    [Authorize(Roles = "Administrador,SuperAdministrador")]
    public async Task<IActionResult> CambiarEstado(
        string id,
        [FromBody] CambiarEstadoUsuarioRequest request)
    {
        var usuarioActual = await _userManager.GetUserAsync(User);

        if (usuarioActual == null)
            return Unauthorized();

        if (usuarioActual.Id == id)
            return BadRequest(new
            {
                message = "No podés modificar tu propio estado."
            });

        if (!Enum.TryParse<EstadoUsuario>(
                request.Estado,
                true,
                out var nuevoEstado) ||
            !Enum.IsDefined(typeof(EstadoUsuario), nuevoEstado))
        {
            return BadRequest(new
            {
                message = "El estado indicado no es válido."
            });
        }

        var usuarioObjetivo = await _userManager.Users
     .Include(u => u.Rol)
     .FirstOrDefaultAsync(u => u.Id == id);

        if (usuarioObjetivo == null)
            return NotFound(new
            {
                message = "No se encontró el usuario."
            });

        var rolObjetivo = usuarioObjetivo.Rol?.Nombre ?? "";

        // Un SuperAdministrador no puede ser modificado desde este endpoint.
        if (rolObjetivo == "SuperAdministrador")
            return Forbid();

        if (User.IsInRole("Administrador"))
        {
            // Solo puede gestionar usuarios de su propio edificio.
            if (usuarioActual.IdEdificio == null ||
                usuarioObjetivo.IdEdificio != usuarioActual.IdEdificio)
            {
                return Forbid();
            }

            // El administrador solo puede gestionar residentes.
            var rolesPermitidos = new[]
            {
                "Inquilino",
                "Propietario",
                "Encargado"
            };

            if (!rolesPermitidos.Contains(rolObjetivo))
                return Forbid();
        }

        usuarioObjetivo.Estado = nuevoEstado;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "El estado del usuario fue actualizado correctamente.",
            id = usuarioObjetivo.Id,
            estado = usuarioObjetivo.Estado.ToString()
        });
    }
}

public class CambiarEstadoUsuarioRequest
{
    public string Estado { get; set; } = string.Empty;
}
