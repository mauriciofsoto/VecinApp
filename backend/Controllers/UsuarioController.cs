
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
}
