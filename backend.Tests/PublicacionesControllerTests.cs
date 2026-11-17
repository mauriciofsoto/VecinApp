using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using VecinApp.Controllers;
using VecinApp.Data;
using VecinApp.Models;
using Xunit;

namespace VecinApp.Tests;

public sealed class PublicacionesControllerTests
{
    [Fact]
    public async Task Comentario_persistido_identifica_si_pertenece_al_usuario_del_claim()
    {
        await using var fixture = await Fixture.CrearAsync("Propietario", EstadoUsuario.Activo);
        var controller = fixture.CrearController();
        var publicacion = await controller.CrearPublicacion(
            new CrearPublicacionRequest { Titulo = "Título", Tipo = "publicacion", Contenido = "Contenido" },
            CancellationToken.None);
        Assert.IsType<CreatedAtActionResult>(publicacion.Result);
        var guardada = await fixture.Db.Publicaciones.SingleAsync();

        var comentarioResult = await controller.CrearComentario(
            guardada.IdPublicacion,
            new CrearComentarioRequest { Contenido = "Comentario guardado" },
            CancellationToken.None);
        var comentario = Assert.IsType<ComentarioResponseDto>(Assert.IsType<OkObjectResult>(comentarioResult.Result).Value);
        Assert.Equal("Usuario Prueba", comentario.UserName);
        Assert.Equal("Comentario guardado", comentario.Content);
        Assert.True(comentario.IsMine);
        Assert.NotEqual(default, comentario.CreatedAt);
        Assert.NotEmpty((await fixture.Db.Comentarios.SingleAsync()).IdUsuario);

        var otroId = $"otro-{Guid.NewGuid():N}";
        var otro = new Usuario
        {
            Id = otroId, UserName = otroId, Email = $"{otroId}@vecinapp.local", Nombre = "Otra",
            Apellido = "Cuenta", Estado = EstadoUsuario.Activo, IdRol = 4,
            Rol = await fixture.Db.RolesAplicacion.SingleAsync(r => r.Nombre == "Inquilino"),
            IdEdificio = 1, Edificio = await fixture.Db.Edificios.SingleAsync()
        };
        fixture.Db.Users.Add(otro);
        await fixture.Db.SaveChangesAsync();
        Assert.Single(await fixture.Db.Publicaciones.ToListAsync());
        var otroUsuario = await fixture.CrearController(otroId).GetPublicaciones(CancellationToken.None);
        var publicacionesDeOtro = Assert.IsAssignableFrom<IEnumerable<PublicacionResponseDto>>(
            Assert.IsType<OkObjectResult>(otroUsuario.Result).Value);
        var publicacionDeOtro = Assert.Single(publicacionesDeOtro);
        Assert.False(Assert.Single(publicacionDeOtro.Comments).IsMine);
    }

    [Fact]
    public async Task Reaccion_persistida_devuelve_conteo_compartido_y_estado_individual()
    {
        await using var fixture = await Fixture.CrearAsync("Propietario", EstadoUsuario.Activo);
        var controller = fixture.CrearController();
        await controller.CrearPublicacion(
            new CrearPublicacionRequest { Titulo = "Título", Tipo = "publicacion", Contenido = "Contenido" },
            CancellationToken.None);
        var publicacion = await fixture.Db.Publicaciones.SingleAsync();

        var first = await controller.AlternarReaccion(publicacion.IdPublicacion,
            new CrearReaccionRequest { Emoji = "👍" }, CancellationToken.None);
        var reactionsA = Assert.IsType<OkObjectResult>(first.Result).Value as IReadOnlyList<ReaccionResponseDto>;
        Assert.True(Assert.Single(reactionsA!).Reacted);
        Assert.Equal(1, Assert.Single(reactionsA).Count);
        Assert.Single(await fixture.Db.ReaccionesPublicacion.ToListAsync());

        var otroId = $"otro-{Guid.NewGuid():N}";
        fixture.Db.Users.Add(new Usuario
        {
            Id = otroId, UserName = otroId, Email = $"{otroId}@vecinapp.local", Nombre = "Otra",
            Apellido = "Cuenta", Estado = EstadoUsuario.Activo, IdRol = 4,
            Rol = await fixture.Db.RolesAplicacion.SingleAsync(r => r.Nombre == "Inquilino"),
            IdEdificio = 1, Edificio = await fixture.Db.Edificios.SingleAsync()
        });
        await fixture.Db.SaveChangesAsync();

        var controllerB = fixture.CrearController(otroId);
        var feedB = await controllerB.GetPublicaciones(CancellationToken.None);
        var publicationB = Assert.Single(Assert.IsAssignableFrom<IEnumerable<PublicacionResponseDto>>(
            Assert.IsType<OkObjectResult>(feedB.Result).Value));
        Assert.Equal(1, Assert.Single(publicationB.Reactions).Count);
        Assert.False(Assert.Single(publicationB.Reactions).Reacted);

        var second = await controllerB.AlternarReaccion(publicacion.IdPublicacion,
            new CrearReaccionRequest { Emoji = "👍" }, CancellationToken.None);
        var reactionsB = Assert.IsType<OkObjectResult>(second.Result).Value as IReadOnlyList<ReaccionResponseDto>;
        Assert.Equal(2, Assert.Single(reactionsB!).Count);
        Assert.True(Assert.Single(reactionsB).Reacted);
    }

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
                .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
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

        public PublicacionesController CrearController(string? userId = null)
        {
            var httpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[] { new Claim(ClaimTypes.NameIdentifier, userId ?? _userId) },
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
