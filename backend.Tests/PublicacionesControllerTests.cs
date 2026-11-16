using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Controllers;
using VecinApp.Data;
using VecinApp.Models;
using Xunit;

namespace VecinApp.Tests;

public sealed class PublicacionesControllerTests
{
    [Theory]
    [InlineData("GET", "Propietario")]
    [InlineData("crear", "Inquilino")]
    [InlineData("estado", "Administrador")]
    [InlineData("comentar", "Propietario")]
    [InlineData("reaccionar", "Inquilino")]
    public async Task Usuario_inactivo_no_puede_operar_en_ningun_endpoint(
        string operacion,
        string rol)
    {
        await using var fixture = await Fixture.CrearAsync(rol, EstadoUsuario.Desactivado);
        var controller = fixture.CrearController();

        IActionResult resultado;
        switch (operacion)
        {
            case "GET":
                resultado = (await controller.GetPublicaciones(CancellationToken.None)).Result!;
                break;
            case "crear":
                resultado = (await controller.CrearPublicacion(
                    new CrearPublicacionRequest
                    {
                        Titulo = "Título",
                        Tipo = rol == "Administrador" ? "aviso" : "publicacion",
                        Contenido = "Contenido"
                    },
                    CancellationToken.None)).Result!;
                break;
            case "estado":
                resultado = await controller.CambiarEstado(
                    123,
                    new CambiarEstadoPublicacionRequest { Activa = false },
                    CancellationToken.None);
                break;
            case "comentar":
                resultado = (await controller.CrearComentario(
                    123,
                    new CrearComentarioRequest { Contenido = "Comentario" },
                    CancellationToken.None)).Result!;
                break;
            case "reaccionar":
                resultado = (await controller.AlternarReaccion(
                    123,
                    new CrearReaccionRequest { Emoji = "👍" },
                    CancellationToken.None)).Result!;
                break;
            default:
                throw new InvalidOperationException($"Operación de prueba desconocida: {operacion}");
        }

        Assert.IsType<ForbidResult>(resultado);
    }

    [Theory]
    [InlineData("Propietario", "publicacion", false, 201)]
    [InlineData("Inquilino", "publicacion", false, 201)]
    [InlineData("Administrador", "aviso", false, 201)]
    [InlineData("SuperAdministrador", "aviso", true, 201)]
    [InlineData("Administrador", "publicacion", false, 403)]
    [InlineData("Propietario", "aviso", false, 403)]
    [InlineData("Inquilino", "aviso", false, 403)]
    [InlineData("Portero", "publicacion", false, 403)]
    [InlineData("Portero", "aviso", false, 403)]
    [InlineData("Propietario", "encuesta", false, 400)]
    [InlineData("Administrador", "encuesta", false, 400)]
    [InlineData("Inquilino", "publicacion", true, 403)]
    public async Task Crear_publicacion_aplica_permisos_por_rol(
        string rol,
        string tipo,
        bool prioritaria,
        int statusCodeEsperado)
    {
        await using var fixture = await Fixture.CrearAsync(rol, EstadoUsuario.Activo);
        var resultado = await fixture.CrearController().CrearPublicacion(
            new CrearPublicacionRequest
            {
                Titulo = "Título",
                Tipo = tipo,
                Contenido = "Contenido",
                Prioritaria = prioritaria
            },
            CancellationToken.None);

        var action = resultado.Result!;
        var statusCode = action switch
        {
            CreatedAtActionResult => StatusCodes.Status201Created,
            ForbidResult => StatusCodes.Status403Forbidden,
            BadRequestObjectResult => StatusCodes.Status400BadRequest,
            _ => throw new Xunit.Sdk.XunitException(
                $"Resultado inesperado: {action.GetType().Name}")
        };
        Assert.Equal(statusCodeEsperado, statusCode);

        if (statusCodeEsperado == StatusCodes.Status201Created)
        {
            var guardada = await fixture.Db.Publicaciones.SingleAsync();
            Assert.Equal(tipo, guardada.CategoriaPublicacion.Nombre);
            Assert.Equal(prioritaria, guardada.Prioritaria);
        }
        else
        {
            Assert.Empty(await fixture.Db.Publicaciones.ToListAsync());
        }
    }

    private sealed class Fixture : IAsyncDisposable
    {
        private readonly string _userId = $"usuario-{Guid.NewGuid():N}";

        public AppDbContext Db { get; }

        private Fixture(AppDbContext db)
        {
            Db = db;
        }

        public static async Task<Fixture> CrearAsync(string rolUsuario, EstadoUsuario estado)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase($"Publicaciones-{Guid.NewGuid():N}")
                .Options;
            var db = new AppDbContext(options);
            var fixture = new Fixture(db);
            var roles = new[]
            {
                new Rol { IdRol = 1, Nombre = "Administrador" },
                new Rol { IdRol = 2, Nombre = "SuperAdministrador" },
                new Rol { IdRol = 3, Nombre = "Propietario" },
                new Rol { IdRol = 4, Nombre = "Inquilino" },
                new Rol { IdRol = 5, Nombre = "Portero" }
            };
            var edificio = new Edificio
            {
                IdEdificio = 1,
                Nombre = "Edificio de prueba",
                Direccion = "Calle 1",
                Estado = "Activo"
            };
            db.RolesAplicacion.AddRange(roles);
            db.Edificios.Add(edificio);
            db.CategoriasPublicacion.AddRange(
                new CategoriaPublicacion { IdCategoriaPublicacion = 1, Nombre = "publicacion" },
                new CategoriaPublicacion { IdCategoriaPublicacion = 2, Nombre = "aviso" });

            var usuario = new Usuario
            {
                Id = fixture._userId,
                UserName = fixture._userId,
                Email = $"{fixture._userId}@vecinapp.local",
                Nombre = "Usuario",
                Apellido = "Prueba",
                Estado = estado,
                IdRol = roles.Single(item => item.Nombre == rolUsuario).IdRol,
                Rol = roles.Single(item => item.Nombre == rolUsuario),
                IdEdificio = edificio.IdEdificio,
                Edificio = edificio
            };
            db.Users.Add(usuario);
            await db.SaveChangesAsync();
            return fixture;
        }

        public PublicacionesController CrearController()
        {
            var httpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[] { new Claim(ClaimTypes.NameIdentifier, _userId) },
                    authenticationType: "test"))
            };

            return new PublicacionesController(Db)
            {
                ControllerContext = new ControllerContext { HttpContext = httpContext }
            };
        }

        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }
}
