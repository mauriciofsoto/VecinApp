using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using VecinApp.Controllers;
using VecinApp.Data;
using VecinApp.DTOs;
using VecinApp.Models;
using VecinApp.Services;
using Xunit;

namespace VecinApp.Tests;

public sealed class CommunityAccessTests
{
    private static readonly Guid AccessIdBuildingOne = Guid.Parse("b5565743-968b-4030-a16d-0c900f9290c3");
    private static readonly Guid AccessIdBuildingFour = Guid.Parse("bf034f84-1f75-4665-9bc4-e7199fed2aeb");

    [Theory]
    [InlineData("admin-building-1", 1, "Edificio de prueba", "b5565743-968b-4030-a16d-0c900f9290c3")]
    [InlineData("admin-building-4", 4, "Luzyfuerza", "bf034f84-1f75-4665-9bc4-e7199fed2aeb")]
    public async Task ObtenerQrComunidad_retorna_el_acceso_del_edificio_de_la_sesion(
        string userId, int expectedBuildingId, string expectedName, string expectedAccessId)
    {
        await using var fixture = await Fixture.CreateAsync();
        var controller = fixture.CreateCodesController(userId);

        var result = Assert.IsType<OkObjectResult>(await controller.ObtenerQrComunidad());

        Assert.Equal(expectedBuildingId, Property<int>(result.Value!, "idEdificio"));
        Assert.Equal(expectedName, Property<string>(result.Value!, "nombreEdificio"));
        Assert.Equal(expectedAccessId, Property<Guid>(result.Value!, "identificadorPublico").ToString());
        Assert.Empty(typeof(CodigosInvitacionController)
            .GetMethod(nameof(CodigosInvitacionController.ObtenerQrComunidad))!
            .GetParameters());
    }

    [Fact]
    public async Task Identificador_publico_invalido_no_emite_token()
    {
        await using var fixture = await Fixture.CreateAsync();
        var controller = fixture.CreateCodesController("admin-building-1");

        var result = await controller.EmitirTokenAccesoComunidad(Guid.NewGuid());

        Assert.IsType<NotFoundObjectResult>(result);
        Assert.Empty(await fixture.Db.TokensAccesoEdificio.ToListAsync());
    }

    [Fact]
    public async Task RegistroComunidad_asocia_el_usuario_al_edificio_del_token_validado()
    {
        await using var fixture = await Fixture.CreateAsync();
        const string rawToken = "token-temporal-de-prueba-edificio-4";
        fixture.Db.TokensAccesoEdificio.Add(new TokenAccesoEdificio
        {
            IdEdificio = 4,
            HashToken = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken))),
            FechaCreacion = DateTime.UtcNow,
            FechaExpiracion = DateTime.UtcNow.AddDays(1),
        });
        await fixture.Db.SaveChangesAsync();

        var request = new RegistroAccesoComunidadRequest
        {
            Nombre = "Inquilino",
            Apellido = "Prueba",
            Email = "inquilino-building-4@example.test",
            Password = "StrongPass123!",
            TokenAcceso = rawToken,
            Perfil = "Inquilino",
            ViveEnEdificio = true,
            TieneOtrasUnidades = false,
            DeclaraUnidadesAlquiladas = false,
            ModalidadAlquiler = "Directo",
            PropietarioDeclaradoViveEnEdificio = false,
            Unidades =
            [
                new UnidadRegistroComunitarioRequest
                {
                    Tipo = "Ocupacion",
                    Piso = "2",
                    Identificacion = "B",
                },
            ],
        };

        var result = await fixture.CreateAuthController().RegistroComunidad(request);

        Assert.IsType<OkObjectResult>(result);
        var created = await fixture.UserManager.FindByEmailAsync(request.Email);
        Assert.NotNull(created);
        Assert.Equal(4, created.IdEdificio);
        Assert.Equal("Inquilino", await fixture.Db.RolesAplicacion
            .Where(role => role.IdRol == created.IdRol)
            .Select(role => role.Nombre)
            .SingleAsync());
        Assert.True(await fixture.Db.RegistrosComunitarios.AnyAsync(registro => registro.IdUsuario == created.Id));
        Assert.True(await fixture.Db.DeclaracionesUnidadesComunitarias
            .AnyAsync(declaracion => declaracion.IdUsuario == created.Id && declaracion.IdEdificio == 4));

        var communityForBuildingFour = await fixture.CreateUsersController("admin-building-4")
            .ObtenerPersonasComunidad();
        var buildingFourResult = Assert.IsType<OkObjectResult>(communityForBuildingFour.Result);
        var buildingFourPeople = Assert.IsAssignableFrom<IReadOnlyList<UsuarioComunidadDto>>(buildingFourResult.Value);
        Assert.Contains(buildingFourPeople, person => person.Id == created.Id);

        var communityForBuildingOne = await fixture.CreateUsersController("admin-building-1")
            .ObtenerPersonasComunidad();
        var buildingOneResult = Assert.IsType<OkObjectResult>(communityForBuildingOne.Result);
        var buildingOnePeople = Assert.IsAssignableFrom<IReadOnlyList<UsuarioComunidadDto>>(buildingOneResult.Value);
        Assert.DoesNotContain(buildingOnePeople, person => person.Id == created.Id);
    }

    private static T Property<T>(object value, string name) =>
        (T)value.GetType().GetProperty(name)!.GetValue(value)!;

    private sealed class Fixture : IAsyncDisposable
    {
        private readonly ServiceProvider _services;

        private Fixture(ServiceProvider services)
        {
            _services = services;
            Db = services.GetRequiredService<AppDbContext>();
            UserManager = services.GetRequiredService<UserManager<Usuario>>();
        }

        public AppDbContext Db { get; }
        public UserManager<Usuario> UserManager { get; }

        public static async Task<Fixture> CreateAsync()
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDbContext<AppDbContext>(options => options
                .UseInMemoryDatabase($"community-access-{Guid.NewGuid():N}")
                .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
            services.AddIdentityCore<Usuario>()
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<AppDbContext>();

            var fixture = new Fixture(services.BuildServiceProvider());
            fixture.Db.Edificios.AddRange(
                new Edificio
                {
                    IdEdificio = 1,
                    Nombre = "Edificio de prueba",
                    Direccion = "Av. Corrientes 1234",
                    Localidad = "CABA",
                    Provincia = "Buenos Aires",
                    Estado = "Activo",
                    AccesoPublicoId = AccessIdBuildingOne,
                },
                new Edificio
                {
                    IdEdificio = 4,
                    Nombre = "Luzyfuerza",
                    Direccion = "callefalsa 123",
                    Localidad = "CABA",
                    Provincia = "Buenos Aires",
                    Estado = "Activo",
                    AccesoPublicoId = AccessIdBuildingFour,
                });
            fixture.Db.RolesAplicacion.AddRange(
                new Rol { IdRol = 1, Nombre = "Administrador" },
                new Rol { IdRol = 5, Nombre = "Inquilino" });
            fixture.Db.Users.AddRange(
                new Usuario
                {
                    Id = "admin-building-1",
                    UserName = "admin1@example.test",
                    Email = "admin1@example.test",
                    Nombre = "Admin",
                    Apellido = "Uno",
                    IdRol = 1,
                    IdEdificio = 1,
                    Estado = EstadoUsuario.Activo,
                },
                new Usuario
                {
                    Id = "admin-building-4",
                    UserName = "admin4@example.test",
                    Email = "admin4@example.test",
                    Nombre = "Admin",
                    Apellido = "Cuatro",
                    IdRol = 1,
                    IdEdificio = 4,
                    Estado = EstadoUsuario.Activo,
                });
            await fixture.Db.SaveChangesAsync();
            return fixture;
        }

        public CodigosInvitacionController CreateCodesController(string userId)
        {
            var controller = new CodigosInvitacionController(Db, UserManager, new AccesoEdificioService(Db));
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim(ClaimTypes.NameIdentifier, userId)], "test")),
                },
            };
            return controller;
        }

        public AuthController CreateAuthController()
        {
            var notifications = new NotificacionesService(Db);
            var controller = new AuthController(
                UserManager,
                null!,
                Db,
                null!,
                new AccesoEdificioService(Db),
                new VinculacionesService(Db, notifications));
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
            return controller;
        }

        public UsuariosController CreateUsersController(string userId)
        {
            var controller = new UsuariosController(Db, UserManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim(ClaimTypes.NameIdentifier, userId)], "test")),
                },
            };
            return controller;
        }

        public async ValueTask DisposeAsync()
        {
            await _services.DisposeAsync();
        }
    }
}
