using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;

namespace VecinApp.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _context;

    public HealthController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var databaseConnected = await _context.Database.CanConnectAsync();

        if (!databaseConnected)
        {
            return StatusCode(503, new
            {
                status = "error",
                database = "disconnected"
            });
        }

        return Ok(new
        {
            status = "ok",
            database = "connected"
        });
    }
}