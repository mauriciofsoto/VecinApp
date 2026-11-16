using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.DTOs;
using VecinApp.Models;

namespace VecinApp.Controllers;

[ApiController]
[Route("api/espacios-comunes")]
[Authorize(Roles = "Administrador,Inquilino,Propietario")]
public class EspaciosComunesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<Usuario> _userManager;

    public EspaciosComunesController(AppDbContext context, UserManager<Usuario> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> ObtenerEspacios(CancellationToken ct)
    {
        var usuario = await _userManager.GetUserAsync(User);
        if (usuario == null)
            return Unauthorized();

        if (usuario.Estado != EstadoUsuario.Activo || usuario.IdEdificio == null)
            return Forbid();

        var espacios = await _context.EspaciosComunes
            .AsNoTracking()
            .Where(e => e.IdEdificio == usuario.IdEdificio.Value && e.Activo)
            .OrderBy(e => e.Nombre)
            .Select(e => new EspacioComunDto(
                e.IdEspacioComun,
                e.IdEdificio,
                e.Nombre,
                e.Descripcion,
                e.HoraApertura.ToString(@"hh\:mm"),
                e.HoraCierre.ToString(@"hh\:mm"),
                e.CapacidadMaxima,
                e.Activo
            ))
            .ToListAsync(ct);

        return Ok(espacios);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObtenerEspacioPorId(int id, CancellationToken ct)
    {
        var usuario = await _userManager.GetUserAsync(User);
        if (usuario == null)
            return Unauthorized();

        if (usuario.Estado != EstadoUsuario.Activo || usuario.IdEdificio == null)
            return Forbid();

        var espacio = await _context.EspaciosComunes
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.IdEspacioComun == id && e.IdEdificio == usuario.IdEdificio.Value, ct);

        if (espacio == null)
            return NotFound(new { mensaje = "Espacio común no encontrado." });

        return Ok(new EspacioComunDto(
            espacio.IdEspacioComun,
            espacio.IdEdificio,
            espacio.Nombre,
            espacio.Descripcion,
            espacio.HoraApertura.ToString(@"hh\:mm"),
            espacio.HoraCierre.ToString(@"hh\:mm"),
            espacio.CapacidadMaxima,
            espacio.Activo
        ));
    }
}
