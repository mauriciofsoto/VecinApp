
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.Models;

namespace VecinApp.Controllers;

[ApiController]
[Route("api/incidencias")]
[Authorize]
public class IncidenciasController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<Usuario> _userManager;

    public IncidenciasController(
        AppDbContext context,
        UserManager<Usuario> userManager)
    {
        _context = context;
        _userManager = userManager;
    }


    // GET /api/incidencias/categorias
    [HttpGet("categorias")]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<IActionResult> ListarCategorias()
    {
        var categorias = await _context.Set<CategoriaIncidencia>()
            .AsNoTracking()
            .Select(c => new
            {
                idCategoriaIncidencia = c.IdCategoriaIncidencia,
                nombre = c.Nombre
            })
            .ToListAsync();

        return Ok(categorias);
    }


   
    // GET /api/incidencias/estados
    [HttpGet("estados")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> ListarEstados()
    {
        var estados = await _context.Set<EstadoIncidencia>()
            .AsNoTracking()
            .Select(e => new
            {
                idEstadoIncidencia = e.IdEstadoIncidencia,
                nombre = e.Nombre
            })
            .ToListAsync();

        return Ok(estados);
    }

    // POST /api/incidencias
    // Propietarios e inquilinos crean incidencias.
    [HttpPost]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<IActionResult> Crear(
        [FromBody] CrearIncidenciaRequest request)
    {
        var usuario = await _userManager.GetUserAsync(User);

        if (usuario == null)
            return Unauthorized();

        if (usuario.Estado != EstadoUsuario.Activo)
            return Forbid();

        if (!usuario.IdEdificio.HasValue)
        {
            return BadRequest(new
            {
                mensaje = "El usuario no tiene un edificio asignado."
            });
        }

        if (string.IsNullOrWhiteSpace(request.Titulo) ||
            string.IsNullOrWhiteSpace(request.Descripcion))
        {
            return BadRequest(new
            {
                mensaje = "El título y la descripción son obligatorios."
            });
        }

        var prioridadesValidas = new[] { "Baja", "Media", "Alta" };

        var prioridad = prioridadesValidas.FirstOrDefault(p =>
            p.Equals(
                request.Prioridad?.Trim(),
                StringComparison.OrdinalIgnoreCase));

        if (prioridad == null)
        {
            return BadRequest(new
            {
                mensaje = "La prioridad debe ser Baja, Media o Alta."
            });
        }

        var categoria = await _context.Set<CategoriaIncidencia>()
            .FirstOrDefaultAsync(c =>
                c.IdCategoriaIncidencia ==
                request.IdCategoriaIncidencia);

        if (categoria == null)
        {
            return BadRequest(new
            {
                mensaje = "La categoría indicada no existe."
            });
        }

        var estadoPendiente = await _context.Set<EstadoIncidencia>()
            .FirstOrDefaultAsync(e =>
                e.Nombre.ToLower() == "pendiente");

        if (estadoPendiente == null)
        {
            return StatusCode(500, new
            {
                mensaje = "No existe el estado Pendiente en la base de datos."
            });
        }

        var incidencia = new Incidencia
        {
            IdEdificio = usuario.IdEdificio.Value,
            IdUsuarioReportante = usuario.Id,
            IdEstadoIncidencia = estadoPendiente.IdEstadoIncidencia,
            IdCategoriaIncidencia = categoria.IdCategoriaIncidencia,
            Titulo = request.Titulo.Trim(),
            Descripcion = request.Descripcion.Trim(),
            Prioridad = prioridad,
            FechaCreacion = DateTime.UtcNow
        };

        _context.Set<Incidencia>().Add(incidencia);
        await _context.SaveChangesAsync();

        return Created(
            $"/api/incidencias/{incidencia.IdIncidencia}",
            new
            {
                incidencia.IdIncidencia,
                incidencia.Titulo,
                incidencia.Descripcion,
                incidencia.Prioridad,
                incidencia.FechaCreacion,
                Estado = estadoPendiente.Nombre,
                Mensaje = "Incidencia creada correctamente."
            });
    }

    // GET /api/incidencias
    // El administrador ve las incidencias de su edificio.
    [HttpGet]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Listar()
    {
        var usuario = await _userManager.GetUserAsync(User);

        if (usuario == null)
            return Unauthorized();

        if (usuario.Estado != EstadoUsuario.Activo)
            return Forbid();

        if (!usuario.IdEdificio.HasValue)
        {
            return BadRequest(new
            {
                mensaje = "El administrador no tiene un edificio asignado."
            });
        }

        var incidencias = await _context.Set<Incidencia>()
            .AsNoTracking()
            .Where(i => i.IdEdificio == usuario.IdEdificio.Value)
            .OrderByDescending(i => i.FechaCreacion)
            .Select(i => new
            {
                i.IdIncidencia,
                i.Titulo,
                i.Descripcion,
                i.Prioridad,
                i.FechaCreacion,
                Estado = i.EstadoIncidencia.Nombre,
                Categoria = i.CategoriaIncidencia.Nombre,
                Reportante = i.UsuarioReportante.Nombre + " " +
                             i.UsuarioReportante.Apellido,
                Responsable = i.UsuarioResponsable == null
                    ? null
                    : i.UsuarioResponsable.Nombre + " " +
                      i.UsuarioResponsable.Apellido
            })
            .ToListAsync();

        return Ok(incidencias);
    }

    // GET /api/incidencias/mis-incidencias
    // El inquilino o propietario ve únicamente las incidencias que reportó.
    [HttpGet("mis-incidencias")]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<IActionResult> ListarMisIncidencias()
    {
        var usuario = await _userManager.GetUserAsync(User);

        if (usuario == null)
            return Unauthorized();

        if (usuario.Estado != EstadoUsuario.Activo)
            return Forbid();

        var incidencias = await _context.Set<Incidencia>()
            .AsNoTracking()
            .Where(i => i.IdUsuarioReportante == usuario.Id)
            .OrderByDescending(i => i.FechaCreacion)
            .Select(i => new
            {
                i.IdIncidencia,
                i.Titulo,
                i.Descripcion,
                i.Prioridad,
                i.FechaCreacion,
                Estado = i.EstadoIncidencia.Nombre,
                Categoria = i.CategoriaIncidencia.Nombre,
                Reportante = i.UsuarioReportante.Nombre + " " +
                             i.UsuarioReportante.Apellido,
                Responsable = i.UsuarioResponsable == null
                    ? null
                    : i.UsuarioResponsable.Nombre + " " +
                      i.UsuarioResponsable.Apellido
            })
            .ToListAsync();

        return Ok(incidencias);
    }

    // GET /api/incidencias/{id}
    [HttpGet("{id:int}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> ObtenerDetalle(int id)
    {
        var usuario = await _userManager.GetUserAsync(User);

        if (usuario == null)
            return Unauthorized();

        if (usuario.Estado != EstadoUsuario.Activo)
            return Forbid();

        if (!usuario.IdEdificio.HasValue)
            return BadRequest(new
            {
                mensaje = "El administrador no tiene un edificio asignado."
            });

        var incidencia = await _context.Incidencias
            .AsNoTracking()
            .Where(i => i.IdIncidencia == id &&
                        i.IdEdificio == usuario.IdEdificio.Value)
            .Select(i => new
            {
                i.IdIncidencia,
                i.Titulo,
                i.Descripcion,
                i.Prioridad,
                i.FechaCreacion,
                i.IdEstadoIncidencia,
                Estado = i.EstadoIncidencia.Nombre,
                i.IdCategoriaIncidencia,
                Categoria = i.CategoriaIncidencia.Nombre,
                Reportante = i.UsuarioReportante.Nombre + " " +
                             i.UsuarioReportante.Apellido,
                Responsable = i.UsuarioResponsable == null
                    ? null
                    : i.UsuarioResponsable.Nombre + " " +
                      i.UsuarioResponsable.Apellido
            })
            .FirstOrDefaultAsync();

        if (incidencia == null)
            return NotFound(new
            {
                mensaje = "No se encontró la incidencia en tu edificio."
            });

        return Ok(incidencia);
    }

    // PUT /api/incidencias/{id}/estado
    // El administrador cambia el estado.
    [HttpPut("{id:int}/estado")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> CambiarEstado(
        int id,
        [FromBody] CambiarEstadoIncidenciaRequest request)
    {
        var usuario = await _userManager.GetUserAsync(User);

        if (usuario == null)
            return Unauthorized();

        if (usuario.Estado != EstadoUsuario.Activo)
            return Forbid();

        if (!usuario.IdEdificio.HasValue)
        {
            return BadRequest(new
            {
                mensaje = "El administrador no tiene un edificio asignado."
            });
        }

        var incidencia = await _context.Set<Incidencia>()
            .FirstOrDefaultAsync(i =>
                i.IdIncidencia == id &&
                i.IdEdificio == usuario.IdEdificio.Value);

        if (incidencia == null)
        {
            return NotFound(new
            {
                mensaje = "No se encontró la incidencia en tu edificio."
            });
        }

        var nuevoEstado = await _context.Set<EstadoIncidencia>()
            .FirstOrDefaultAsync(e =>
                e.IdEstadoIncidencia == request.IdEstadoIncidencia);

        if (nuevoEstado == null)
        {
            return BadRequest(new
            {
                mensaje = "El estado indicado no existe."
            });
        }

        incidencia.IdEstadoIncidencia = nuevoEstado.IdEstadoIncidencia;
        incidencia.IdUsuarioResponsable = usuario.Id;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            incidencia.IdIncidencia,
            Estado = nuevoEstado.Nombre,
            Mensaje = "Estado actualizado correctamente."
        });
    }
}

public class CrearIncidenciaRequest
{
    public int IdCategoriaIncidencia { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string Prioridad { get; set; } = string.Empty;
}

public class CambiarEstadoIncidenciaRequest
{
    public int IdEstadoIncidencia { get; set; }
}
