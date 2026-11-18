
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
[Route("api/unidades")]
[Authorize(Roles = "Administrador")]
public sealed class UnidadesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<Usuario> _userManager;

    public UnidadesController(
        AppDbContext context,
        UserManager<Usuario> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> ObtenerUnidades(CancellationToken ct)
    {
        var validacion = await ObtenerAdministradorAsync(ct);
        if (validacion.Error is not null)
            return validacion.Error;

        var edificioId = validacion.Usuario!.IdEdificio!.Value;

        var unidades = await _context.Unidades
            .AsNoTracking()
            .Where(u => u.IdEdificio == edificioId)
            .OrderBy(u => u.Piso)
            .ThenBy(u => u.Identificacion)
            .Select(u => new UnidadResponse(
                u.IdUnidad,
                u.Piso,
                u.Identificacion))
            .ToListAsync(ct);

        return Ok(unidades);
    }

    [HttpPost]
    public async Task<IActionResult> CrearUnidad(
        [FromBody] CrearUnidadRequest request,
        CancellationToken ct)
    {
        var validacion = await ObtenerAdministradorAsync(ct);
        if (validacion.Error is not null)
            return validacion.Error;

        if (string.IsNullOrWhiteSpace(request.Piso)
            || string.IsNullOrWhiteSpace(request.Identificacion))
        {
            return BadRequest(new
            {
                message = "El piso y la identificación son obligatorios."
            });
        }

        var piso = request.Piso.Trim();
        var identificacion = request.Identificacion.Trim();

        var edificioId = validacion.Usuario!.IdEdificio!.Value;

        var duplicada = await _context.Unidades.AnyAsync(u =>
            u.IdEdificio == edificioId
            && u.Piso.ToUpper() == piso.ToUpper()
            && u.Identificacion.ToUpper() == identificacion.ToUpper(), ct);

        if (duplicada)
        {
            return Conflict(new
            {
                message = "Ya existe una unidad con ese piso e identificación."
            });
        }

        var unidad = new Unidad
        {
            IdEdificio = edificioId,
            Piso = piso,
            Identificacion = identificacion
        };

        _context.Unidades.Add(unidad);

        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return Conflict(new
            {
                message = "No se pudo crear la unidad. Es posible que ya exista."
            });
        }

        return Ok(new UnidadResponse(
            unidad.IdUnidad,
            unidad.Piso,
            unidad.Identificacion));
    }

    private async Task<(Usuario? Usuario, IActionResult? Error)>
        ObtenerAdministradorAsync(CancellationToken ct)
    {
        var usuarioId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(usuarioId))
            return (null, Unauthorized());

        var usuario = await _userManager.FindByIdAsync(usuarioId);

        if (usuario is null)
            return (null, Unauthorized());

        if (usuario.Estado != EstadoUsuario.Activo
            || !usuario.IdEdificio.HasValue
            || !usuario.IdRol.HasValue)
        {
            return (null, Forbid());
        }

        var rol = await _context.RolesAplicacion
            .Where(r => r.IdRol == usuario.IdRol.Value)
            .Select(r => r.Nombre)
            .FirstOrDefaultAsync(ct);

        if (rol != "Administrador")
            return (null, Forbid());

        var edificioActivo = await _context.Edificios.AnyAsync(e =>
            e.IdEdificio == usuario.IdEdificio.Value
            && e.Estado == "Activo", ct);

        if (!edificioActivo)
            return (null, Forbid());

        return (usuario, null);
    }
}

public sealed class CrearUnidadRequest
{
    [Required, StringLength(30)]
    public string Piso { get; set; } = string.Empty;

    [Required, StringLength(30)]
    public string Identificacion { get; set; } = string.Empty;
}

public sealed record UnidadResponse(
    int IdUnidad,
    string Piso,
    string Identificacion);
