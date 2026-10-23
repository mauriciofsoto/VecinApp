using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace VecinApp.Controllers;

[ApiController]
[Route("api/prueba-roles")]
public class PruebaRolesController : ControllerBase
{
    [HttpGet("administrador")]
    [Authorize(Roles = "Administrador")]
    public IActionResult Administrador()
    {
        return Ok(new
        {
            mensaje = "Acceso autorizado para Administrador"
        });
    }
}