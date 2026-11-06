using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VecinApp.Services;

namespace VecinApp.Controllers;

[ApiController]
[Route("api/notificaciones")]
[Authorize]
public class NotificacionesController : ControllerBase
{
    private readonly NotificacionesService _notificacionesService;

    public NotificacionesController(
        NotificacionesService notificacionesService)
    {
        _notificacionesService = notificacionesService;
    }

    private string? ObtenerIdUsuario()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    // GET: api/notificaciones
    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var idUsuario = ObtenerIdUsuario();

        if (string.IsNullOrEmpty(idUsuario))
            return Unauthorized();

        var notificaciones =
            await _notificacionesService.ListarAsync(idUsuario);

        return Ok(notificaciones);
    }

    [HttpGet("no-leidas/count")]
    public async Task<IActionResult> ContarNoLeidas()
    {
        var idUsuario = ObtenerIdUsuario();
        if (string.IsNullOrEmpty(idUsuario))
            return Unauthorized();

        return Ok(await _notificacionesService.ContarNoLeidasAsync(idUsuario));
    }

    // PUT: api/notificaciones/{id}/leida
    [HttpPut("{id:int}/leida")]
    public async Task<IActionResult> MarcarComoLeida(int id)
    {
        var idUsuario = ObtenerIdUsuario();

        if (string.IsNullOrEmpty(idUsuario))
            return Unauthorized();

        var resultado =
            await _notificacionesService.MarcarComoLeidaAsync(
                id,
                idUsuario
            );

        if (!resultado)
            return NotFound(new { mensaje = "Notificación no encontrada." });

        return NoContent();
    }

    // PUT: api/notificaciones/leidas
    [HttpPut("leidas")]
    public async Task<IActionResult> MarcarTodasComoLeidas()
    {
        var idUsuario = ObtenerIdUsuario();

        if (string.IsNullOrEmpty(idUsuario))
            return Unauthorized();

        await _notificacionesService.MarcarTodasComoLeidasAsync(idUsuario);

        return NoContent();
    }
}
