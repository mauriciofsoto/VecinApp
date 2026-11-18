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
public sealed class EdificiosController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<Usuario> _userManager;

    public EdificiosController(AppDbContext context, UserManager<Usuario> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> ObtenerEdificios(
        CancellationToken cancellationToken)
    {
        var error = await ValidarSuperAdministradorAsync();
        if (error is not null) return error;

        var edificios = await _context.Edificios
            .AsNoTracking()
            .OrderBy(edificio => edificio.Nombre)
            .ToListAsync(cancellationToken);

        return Ok(edificios.Select(Mapear).ToArray());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObtenerEdificio(
        int id,
        CancellationToken cancellationToken)
    {
        var error = await ValidarSuperAdministradorAsync();
        if (error is not null) return error;

        var edificio = await _context.Edificios
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.IdEdificio == id, cancellationToken);
        if (edificio is null)
            return NotFound(new { message = "No se encontró el edificio." });

        return Ok(Mapear(edificio));
    }

    [HttpPost]
    public async Task<IActionResult> CrearEdificio(
        [FromBody] EdificioRequest request,
        CancellationToken cancellationToken)
    {
        var error = await ValidarSuperAdministradorAsync();
        if (error is not null) return error;

        var errorValidacion = ValidarDatos(request);
        if (errorValidacion is not null) return BadRequest(new { message = errorValidacion });

        var edificio = new Edificio
        {
            Nombre = request.Nombre.Trim(),
            Direccion = request.Direccion.Trim(),
            Localidad = request.Localidad.Trim(),
            Provincia = request.Provincia.Trim(),
            Estado = "Activo"
        };

        _context.Edificios.Add(edificio);
        await _context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(
            nameof(ObtenerEdificio),
            new { id = edificio.IdEdificio },
            Mapear(edificio));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> ActualizarEdificio(
        int id,
        [FromBody] EdificioRequest request,
        CancellationToken cancellationToken)
    {
        var error = await ValidarSuperAdministradorAsync();
        if (error is not null) return error;

        var errorValidacion = ValidarDatos(request);
        if (errorValidacion is not null) return BadRequest(new { message = errorValidacion });

        var edificio = await _context.Edificios
            .FirstOrDefaultAsync(item => item.IdEdificio == id, cancellationToken);
        if (edificio is null)
            return NotFound(new { message = "No se encontró el edificio." });

        edificio.Nombre = request.Nombre.Trim();
        edificio.Direccion = request.Direccion.Trim();
        edificio.Localidad = request.Localidad.Trim();
        edificio.Provincia = request.Provincia.Trim();
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Mapear(edificio));
    }

    [HttpPatch("{id:int}/estado")]
    public async Task<IActionResult> CambiarEstado(
        int id,
        [FromBody] CambiarEstadoEdificioRequest request,
        CancellationToken cancellationToken)
    {
        var error = await ValidarSuperAdministradorAsync();
        if (error is not null) return error;

        if (request.Estado is not ("Activo" or "Inactivo"))
            return BadRequest(new { message = "El estado debe ser Activo o Inactivo." });

        var edificio = await _context.Edificios
            .FirstOrDefaultAsync(item => item.IdEdificio == id, cancellationToken);
        if (edificio is null)
            return NotFound(new { message = "No se encontró el edificio." });

        edificio.Estado = request.Estado;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Mapear(edificio));
    }

    private async Task<IActionResult?> ValidarSuperAdministradorAsync()
    {
        var usuarioId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(usuarioId))
            return Unauthorized(new { message = "No se pudo identificar al usuario." });

        var usuario = await _userManager.FindByIdAsync(usuarioId);
        if (usuario is null)
            return Unauthorized(new { message = "No se encontró el usuario autenticado." });

        if (usuario.Estado != EstadoUsuario.Activo || !usuario.IdRol.HasValue)
            return Forbid();

        var rol = await _context.RolesAplicacion
            .Where(item => item.IdRol == usuario.IdRol.Value)
            .Select(item => item.Nombre)
            .FirstOrDefaultAsync(HttpContext.RequestAborted);

        return rol == "SuperAdministrador"
            ? null
            : Forbid();
    }

    private static string? ValidarDatos(EdificioRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre)
            || string.IsNullOrWhiteSpace(request.Direccion)
            || string.IsNullOrWhiteSpace(request.Localidad)
            || string.IsNullOrWhiteSpace(request.Provincia))
            return "Nombre, dirección, localidad y provincia son obligatorios.";

        if (request.Nombre.Trim().Length > 150)
            return "El nombre no puede superar los 150 caracteres.";
        if (request.Direccion.Trim().Length > 250)
            return "La dirección no puede superar los 250 caracteres.";
        if (request.Localidad.Trim().Length > 120)
            return "La localidad no puede superar los 120 caracteres.";
        if (request.Provincia.Trim().Length > 120)
            return "La provincia no puede superar los 120 caracteres.";

        return null;
    }

    private static EdificioResponse Mapear(Edificio edificio) => new(
        edificio.IdEdificio,
        edificio.AccesoPublicoId,
        edificio.Nombre,
        edificio.Direccion,
        edificio.Localidad,
        edificio.Provincia,
        edificio.Estado);
}

public sealed class EdificioRequest
{
    [Required, StringLength(150)]
    public string Nombre { get; set; } = string.Empty;

    [Required, StringLength(250)]
    public string Direccion { get; set; } = string.Empty;

    [Required, StringLength(120)]
    public string Localidad { get; set; } = string.Empty;

    [Required, StringLength(120)]
    public string Provincia { get; set; } = string.Empty;
}

public sealed class CambiarEstadoEdificioRequest
{
    [Required]
    public string Estado { get; set; } = string.Empty;
}

public sealed record EdificioResponse(
    int IdEdificio,
    Guid AccesoPublicoId,
    string Nombre,
    string Direccion,
    string Localidad,
    string Provincia,
    string Estado);
