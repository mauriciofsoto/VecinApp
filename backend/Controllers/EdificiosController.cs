
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.Models;

namespace VecinApp.Controllers;

[ApiController]
[Route("api/edificios")]
[Authorize]
public class EdificiosController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<Usuario> _userManager;

    public EdificiosController(
        AppDbContext context,
        UserManager<Usuario> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    private async Task<IActionResult?> ValidarSuperAdministradorAsync()
    {
        var usuarioId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(usuarioId))
            return Unauthorized(new { message = "No se pudo identificar al usuario." });

        var usuario = await _userManager.FindByIdAsync(usuarioId);

        if (usuario == null || !usuario.IdRol.HasValue)
            return Unauthorized(new { message = "Usuario o rol inválido." });

        var rolActual = await _context.RolesAplicacion
            .Where(r => r.IdRol == usuario.IdRol.Value)
            .Select(r => r.Nombre)
            .FirstOrDefaultAsync();

        if (rolActual != "SuperAdministrador")
            return Forbid();

        return null;
    }

    // GET /api/edificios
    [HttpGet]
    public async Task<IActionResult> ObtenerEdificios()
    {
        var error = await ValidarSuperAdministradorAsync();
        if (error != null) return error;

        var edificios = await _context.Edificios
            .AsNoTracking()
            .OrderBy(e => e.Nombre)
            .Select(e => new
            {
                idEdificio = e.IdEdificio,
                nombre = e.Nombre,
                direccion = e.Direccion,
                estado = e.Estado
            })
            .ToListAsync();

        return Ok(edificios);
    }

    // GET /api/edificios/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObtenerEdificio(int id)
    {
        var error = await ValidarSuperAdministradorAsync();
        if (error != null) return error;

        var edificio = await _context.Edificios
            .AsNoTracking()
            .Where(e => e.IdEdificio == id)
            .Select(e => new
            {
                idEdificio = e.IdEdificio,
                nombre = e.Nombre,
                direccion = e.Direccion,
                estado = e.Estado
            })
            .FirstOrDefaultAsync();

        if (edificio == null)
            return NotFound(new { message = "No se encontró el edificio." });

        return Ok(edificio);
    }

    // POST /api/edificios
    [HttpPost]
    public async Task<IActionResult> CrearEdificio([FromBody] EdificioRequest request)
    {
        var error = await ValidarSuperAdministradorAsync();
        if (error != null) return error;

        if (string.IsNullOrWhiteSpace(request.Nombre) ||
            string.IsNullOrWhiteSpace(request.Direccion))
        {
            return BadRequest(new
            {
                message = "El nombre y la dirección son obligatorios."
            });
        }

        var edificio = new Edificio
        {
            Nombre = request.Nombre.Trim(),
            Direccion = request.Direccion.Trim(),
            Estado = "Activo"
        };

        _context.Edificios.Add(edificio);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(ObtenerEdificio),
            new { id = edificio.IdEdificio },
            new
            {
                idEdificio = edificio.IdEdificio,
                nombre = edificio.Nombre,
                direccion = edificio.Direccion,
                estado = edificio.Estado,
                message = "Edificio creado correctamente."
            });
    }

    // PUT /api/edificios/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> ActualizarEdificio(
        int id,
        [FromBody] EdificioRequest request)
    {
        var error = await ValidarSuperAdministradorAsync();
        if (error != null) return error;

        if (string.IsNullOrWhiteSpace(request.Nombre) ||
            string.IsNullOrWhiteSpace(request.Direccion))
        {
            return BadRequest(new
            {
                message = "El nombre y la dirección son obligatorios."
            });
        }

        var edificio = await _context.Edificios
            .FirstOrDefaultAsync(e => e.IdEdificio == id);

        if (edificio == null)
            return NotFound(new { message = "No se encontró el edificio." });

        edificio.Nombre = request.Nombre.Trim();
        edificio.Direccion = request.Direccion.Trim();

        await _context.SaveChangesAsync();

        return Ok(new
        {
            idEdificio = edificio.IdEdificio,
            nombre = edificio.Nombre,
            direccion = edificio.Direccion,
            estado = edificio.Estado,
            message = "Edificio actualizado correctamente."
        });
    }

    // PATCH /api/edificios/{id}/estado
    [HttpPatch("{id:int}/estado")]
    public async Task<IActionResult> CambiarEstado(
        int id,
        [FromBody] CambiarEstadoEdificioRequest request)
    {
        var error = await ValidarSuperAdministradorAsync();
        if (error != null) return error;

        if (request.Estado != "Activo" && request.Estado != "Inactivo")
        {
            return BadRequest(new
            {
                message = "El estado debe ser Activo o Inactivo."
            });
        }

        var edificio = await _context.Edificios
            .FirstOrDefaultAsync(e => e.IdEdificio == id);

        if (edificio == null)
            return NotFound(new { message = "No se encontró el edificio." });

        edificio.Estado = request.Estado;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            idEdificio = edificio.IdEdificio,
            estado = edificio.Estado,
            message = $"El edificio ahora está {edificio.Estado.ToLower()}."
        });
    }
}

public class EdificioRequest
{
    [Required]
    [StringLength(150)]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    [StringLength(250)]
    public string Direccion { get; set; } = string.Empty;
}

public class CambiarEstadoEdificioRequest
{
    [Required]
    public string Estado { get; set; } = string.Empty;
}
