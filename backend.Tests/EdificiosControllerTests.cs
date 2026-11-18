using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VecinApp.Controllers;
using VecinApp.Data;
using VecinApp.Models;
using Xunit;

namespace VecinApp.Tests;

public sealed class EdificiosControllerTests
{
    [Fact]
    public async Task Rechaza_solicitud_sin_usuario_identificado()
    {
        await using var fixture = await Fixture.CrearAsync();
        var result = await fixture.CrearController(null).ObtenerEdificios(CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Rechaza_usuario_que_no_existe()
    {
        await using var fixture = await Fixture.CrearAsync();
        var result = await fixture.CrearController("inexistente").ObtenerEdificios(CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Rechaza_rol_distinto_de_SuperAdministrador()
    {
        await using var fixture = await Fixture.CrearAsync();
        var result = await fixture.CrearController("administrador").ObtenerEdificios(CancellationToken.None);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Rechaza_cuenta_desactivada_aunque_tenga_rol_SuperAdministrador()
    {
        await using var fixture = await Fixture.CrearAsync();
        var result = await fixture.CrearController("super-inactivo").ObtenerEdificios(CancellationToken.None);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task SuperAdministrador_activo_consulta_edificios_con_su_acceso_publico()
    {
        await using var fixture = await Fixture.CrearAsync();
        var result = await fixture.CrearController("super-activo").ObtenerEdificios(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var edificio = Assert.Single(Assert.IsAssignableFrom<EdificioResponse[]>(ok.Value));
        Assert.Equal(fixture.AccesoPublicoId, edificio.AccesoPublicoId);
        Assert.Equal("Rosario", edificio.Localidad);
        Assert.Equal("Santa Fe", edificio.Provincia);
    }

    [Fact]
    public void Controlador_exige_autenticacion()
    {
        var authorize = Assert.Single(typeof(EdificiosController)
            .GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), inherit: true)
            .Cast<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>());

        Assert.Null(authorize.Roles);
    }

    private sealed class Fixture : IAsyncDisposable
    {
        private readonly ServiceProvider _services;
        private readonly AppDbContext _context;
        private readonly UserManager<Usuario> _userManager;
        public Guid AccesoPublicoId { get; } = Guid.Parse("62f0a6d1-005d-45a2-909b-63a50e312b24");

        private Fixture(ServiceProvider services)
        {
            _services = services;
            _context = services.GetRequiredService<AppDbContext>();
            _userManager = services.GetRequiredService<UserManager<Usuario>>();
        }

        public static async Task<Fixture> CrearAsync()
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase($"edificios-{Guid.NewGuid():N}"));
            services.AddIdentityCore<Usuario>()
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<AppDbContext>();

            var fixture = new Fixture(services.BuildServiceProvider());
            await fixture.SeedAsync();
            return fixture;
        }

        public EdificiosController CrearController(string? userId)
        {
            var controller = new EdificiosController(_context, _userManager);
            var httpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext();
            if (userId is not null)
                httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, userId)], "test"));
            controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
            return controller;
        }

        private async Task SeedAsync()
        {
            _context.RolesAplicacion.AddRange(
                new Rol { IdRol = 1, Nombre = "Administrador" },
                new Rol { IdRol = 2, Nombre = "SuperAdministrador" });
            _context.Users.AddRange(
                CrearUsuario("administrador", 1, EstadoUsuario.Activo),
                CrearUsuario("super-activo", 2, EstadoUsuario.Activo),
                CrearUsuario("super-inactivo", 2, EstadoUsuario.Desactivado));
            _context.Edificios.Add(new Edificio
            {
                IdEdificio = 1,
                AccesoPublicoId = AccesoPublicoId,
                Nombre = "Torre Centro",
                Direccion = "Calle 10",
                Localidad = "Rosario",
                Provincia = "Santa Fe",
                Estado = "Activo"
            });
            await _context.SaveChangesAsync();
        }

        private static Usuario CrearUsuario(string id, int idRol, EstadoUsuario estado) => new()
        {
            Id = id,
            UserName = $"{id}@example.test",
            NormalizedUserName = $"{id}@EXAMPLE.TEST".ToUpperInvariant(),
            Email = $"{id}@example.test",
            NormalizedEmail = $"{id}@EXAMPLE.TEST".ToUpperInvariant(),
            Nombre = id,
            Apellido = "Prueba",
            IdRol = idRol,
            Estado = estado
        };

        public async ValueTask DisposeAsync()
        {
            await _context.DisposeAsync();
            await _services.DisposeAsync();
        }
    }
}
