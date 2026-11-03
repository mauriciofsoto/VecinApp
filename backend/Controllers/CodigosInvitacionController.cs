
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.Models;

namespace VecinApp.Controllers;

[ApiController]
[Route("api/codigos-invitacion")]
[Authorize]
public class CodigosInvitacionController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<Usuario> _userManager;

    public CodigosInvitacionController(
        AppDbContext context,
        UserManager<Usuario> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    // POST /api/codigos-invitacion/administrador
    [HttpPost("administrador")]
    public async Task<IActionResult> CrearCodigoAdministrador(
        [FromBody] CrearCodigoInvitacionRequest request)
    {
        var usuarioId = User.FindFirst(
            System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

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

        if (request.IdEdificio <= 0)
            return BadRequest(new { message = "El edificio es obligatorio." });

        if (request.DiasValidez <= 0 || request.DiasValidez > 30)
            return BadRequest(new { message = "La validez debe ser de 1 a 30 días." });

        var edificioExiste = await _context.Edificios
            .AnyAsync(e => e.IdEdificio == request.IdEdificio);

        if (!edificioExiste)
            return BadRequest(new { message = "El edificio indicado no existe." });

        var idRolAdministrador = await _context.RolesAplicacion
            .Where(r => r.Nombre == "Administrador")
            .Select(r => (int?)r.IdRol)
            .FirstOrDefaultAsync();

        if (!idRolAdministrador.HasValue)
            return BadRequest(new { message = "No existe el rol Administrador en la base de datos." });

        string codigo;
        do
        {
            codigo = Convert.ToHexString(
                RandomNumberGenerator.GetBytes(8));
        }
        while (await _context.CodigosInvitacion.AnyAsync(c => c.Codigo == codigo));

        var invitacion = new CodigoInvitacion
        {
            Codigo = codigo,
            IdEdificio = request.IdEdificio,
            IdRol = idRolAdministrador.Value,
            FechaExpiracion = DateTime.UtcNow.AddDays(request.DiasValidez),
            UsosMaximos = 1,
            UsosRealizados = 0,
            Activo = true
        };

        _context.CodigosInvitacion.Add(invitacion);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Código de invitación para administrador creado correctamente.",
            codigo = invitacion.Codigo,
            idEdificio = invitacion.IdEdificio,
            fechaExpiracion = invitacion.FechaExpiracion,
            usosMaximos = invitacion.UsosMaximos
        });
    }

    // POST /api/codigos-invitacion/inquilino
    [HttpPost("inquilino")]
    public async Task<IActionResult> CrearCodigoInquilino(
        [FromBody] CrearCodigoInquilinoRequest request)
    {
        var usuarioId = User.FindFirst(
            System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(usuarioId))
            return Unauthorized(new { message = "No se pudo identificar al usuario." });

        var usuario = await _userManager.FindByIdAsync(usuarioId);

        if (usuario == null || !usuario.IdRol.HasValue)
            return Unauthorized(new { message = "Usuario o rol inválido." });

        var rolActual = await _context.RolesAplicacion
            .Where(r => r.IdRol == usuario.IdRol.Value)
            .Select(r => r.Nombre)
            .FirstOrDefaultAsync();

        if (rolActual != "Administrador")
            return Forbid();

        if (!usuario.IdEdificio.HasValue)
            return BadRequest(new { message = "El administrador no tiene un edificio asignado." });

        if (request.DiasValidez <= 0 || request.DiasValidez > 30)
            return BadRequest(new { message = "La validez debe ser de 1 a 30 días." });

        var idRolInquilino = await _context.RolesAplicacion
            .Where(r => r.Nombre == "Inquilino")
            .Select(r => (int?)r.IdRol)
            .FirstOrDefaultAsync();

        if (!idRolInquilino.HasValue)
            return BadRequest(new { message = "No existe el rol Inquilino." });

        string codigo;

        do
        {
            codigo = Convert.ToHexString(
                RandomNumberGenerator.GetBytes(8));
        }
        while (await _context.CodigosInvitacion
            .AnyAsync(c => c.Codigo == codigo));

        var invitacion = new CodigoInvitacion
        {
            Codigo = codigo,
            IdEdificio = usuario.IdEdificio.Value,
            IdRol = idRolInquilino.Value,
            FechaExpiracion = DateTime.UtcNow.AddDays(request.DiasValidez),
            UsosMaximos = 1,
            UsosRealizados = 0,
            Activo = true
        };

        _context.CodigosInvitacion.Add(invitacion);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Código de invitación para inquilino creado correctamente.",
            codigo = invitacion.Codigo,
            fechaExpiracion = invitacion.FechaExpiracion,
            usosMaximos = invitacion.UsosMaximos
        });
    }

}

public class CrearCodigoInvitacionRequest
{
    public int IdEdificio { get; set; }
    public int DiasValidez { get; set; } = 7;
}
public class CrearCodigoInquilinoRequest
{
    public int DiasValidez { get; set; } = 7;
}