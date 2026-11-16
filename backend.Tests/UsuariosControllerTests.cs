using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VecinApp.Controllers;
using VecinApp.Data;
using VecinApp.DTOs;
using VecinApp.Models;
using Xunit;

namespace VecinApp.Tests;

public sealed class UsuariosControllerTests
{
    [Fact]
    public async Task Perfil_autenticado_devuelve_datos_y_relaciones_solo_del_usuario_solicitante()
    {
        await using var fixture = await Fixture.CrearAsync(incluirPersonas: true);

        var resultadoInquilino = await fixture.CrearController("inquilino-a").ObtenerMiPerfil(CancellationToken.None);
        var inquilino = Assert.IsType<OkObjectResult>(resultadoInquilino.Result).Value as PerfilUsuarioDto;
        Assert.NotNull(inquilino);
        Assert.Equal("Inquilino", inquilino.Rol);
        Assert.Empty(inquilino.UnidadesVinculadas);
        Assert.Equal("Ocupacion", Assert.Single(inquilino.UnidadesDeclaradas).Tipo);

        var resultadoPropietario = await fixture.CrearController("propietario-a").ObtenerMiPerfil(CancellationToken.None);
        var propietario = Assert.IsType<OkObjectResult>(resultadoPropietario.Result).Value as PerfilUsuarioDto;
        Assert.NotNull(propietario);
        Assert.Equal("Propietario", propietario.Rol);
        Assert.Equal("Propietario", Assert.Single(propietario.UnidadesVinculadas).TipoRelacion);
        var declaracion = Assert.Single(propietario.UnidadesDeclaradas);
        Assert.Equal("Pendiente", declaracion.EstadoConfirmacion);
        Assert.True(declaracion.EstaAlquiladaDeclarada);
        Assert.DoesNotContain(propietario.UnidadesDeclaradas, unidad => unidad.Tipo == "Ocupacion");

        var resultadoPortero = await fixture.CrearController("portero-a").ObtenerMiPerfil(CancellationToken.None);
        var portero = Assert.IsType<OkObjectResult>(resultadoPortero.Result).Value as PerfilUsuarioDto;
        Assert.NotNull(portero);
        Assert.Equal("Portero", portero.Rol);
        Assert.Empty(portero.UnidadesVinculadas);
        Assert.Empty(portero.UnidadesDeclaradas);
        Assert.Equal("Seguridad", portero.FuncionPersonal);
        Assert.Equal("Turno mañana", portero.HorarioPersonal);
    }

    [Fact]
    public async Task Devuelve_solo_perfiles_comunitarios_del_edificio_del_administrador_y_sus_declaraciones()
    {
        await using var fixture = await Fixture.CrearAsync(incluirPersonas: true);
        var resultado = await fixture.CrearController().ObtenerPersonasComunidad();

        var ok = Assert.IsType<OkObjectResult>(resultado.Result);
        var personas = Assert.IsAssignableFrom<IReadOnlyList<UsuarioComunidadDto>>(ok.Value);

        Assert.Equal(new[] { "Inquilino", "Portero", "Propietario" }, personas.Select(p => p.Rol).Order().ToArray());
        Assert.DoesNotContain(personas, persona => persona.Rol == "Administrador");
        Assert.DoesNotContain(personas, persona => persona.Id == "inquilino-otro-edificio");
        Assert.All(personas, persona => Assert.Equal("Activo", persona.Estado));
        Assert.All(personas, persona => Assert.Equal(new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc), persona.FechaRegistro));

        var inquilino = Assert.Single(personas, persona => persona.Rol == "Inquilino");
        Assert.Equal("Inquilino", inquilino.PerfilComunitario);
        var declaracion = Assert.Single(inquilino.UnidadesDeclaradas);
        Assert.Equal("Ocupacion", declaracion.Tipo);
        Assert.Equal("Declarada", declaracion.EstadoConfirmacion);
        Assert.Null(declaracion.EstaAlquiladaDeclarada);
        Assert.Equal("4", declaracion.PisoDeclarado);
        Assert.Equal("B", declaracion.IdentificacionDeclarada);
    }

    [Fact]
    public async Task Devuelve_lista_vacia_cuando_el_edificio_no_tiene_personas_comunitarias()
    {
        await using var fixture = await Fixture.CrearAsync(incluirPersonas: false);
        var resultado = await fixture.CrearController().ObtenerPersonasComunidad();

        var ok = Assert.IsType<OkObjectResult>(resultado.Result);
        var personas = Assert.IsAssignableFrom<IReadOnlyList<UsuarioComunidadDto>>(ok.Value);
        Assert.Empty(personas);
    }

    [Fact]
    public void Requiere_autenticacion_y_el_rol_administrador_en_la_metadata_del_endpoint()
    {
        var controllerAuthorization = Assert.Single(typeof(UsuariosController).GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true).Cast<AuthorizeAttribute>());
        var method = typeof(UsuariosController).GetMethod(nameof(UsuariosController.ObtenerPersonasComunidad));
        Assert.NotNull(method);
        var endpointAuthorization = Assert.Single(method!.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true).Cast<AuthorizeAttribute>());

        Assert.Null(controllerAuthorization.Roles);
        Assert.Equal("Administrador", endpointAuthorization.Roles);
    }

    [Fact]
    public async Task Endpoint_responde_401_sin_autenticacion()
    {
        await using var api = await ApiFixture.CrearAsync();
        var response = await api.Client.GetAsync("/api/usuarios/comunidad");

        Assert.Equal(StatusCodes.Status401Unauthorized, (int)response.StatusCode);
    }

    [Theory]
    [InlineData("Inquilino")]
    [InlineData("Propietario")]
    [InlineData("Portero")]
    public async Task Endpoint_responde_403_a_roles_no_administrativos(string rol)
    {
        await using var api = await ApiFixture.CrearAsync();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/usuarios/comunidad");
        request.Headers.Add("X-Test-User", "usuario-no-admin");
        request.Headers.Add("X-Test-Role", rol);

        var response = await api.Client.SendAsync(request);

        Assert.Equal(StatusCodes.Status403Forbidden, (int)response.StatusCode);
    }

    [Fact]
    public async Task Endpoint_administrativo_autenticado_devuelve_200()
    {
        await using var api = await ApiFixture.CrearAsync();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/usuarios/comunidad");
        request.Headers.Add("X-Test-User", "admin-api");
        request.Headers.Add("X-Test-Role", "Administrador");

        var response = await api.Client.SendAsync(request);

        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal("[]", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Actualiza_y_persiste_solo_los_campos_permitidos_del_usuario_autenticado()
    {
        await using var api = await ApiFixture.CrearAsync();
        using var request = new HttpRequestMessage(HttpMethod.Put, "/api/usuarios/me/perfil");
        request.Headers.Add("X-Test-User", "admin-api");
        request.Headers.Add("X-Test-Role", "Administrador");
        request.Content = JsonContent.Create(new
        {
            nombre = " Ada ", apellido = "Nueva ", telefono = "+54 11 5555-1010",
            id = "otro-usuario", rol = "Propietario", idEdificio = 999, estado = "Desactivado"
        });

        var response = await api.Client.SendAsync(request);
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<PerfilUsuarioDto>();
        Assert.NotNull(updated);
        Assert.Equal("Ada", updated.Nombre);
        Assert.Equal("Nueva", updated.Apellido);
        Assert.Equal("+54 11 5555-1010", updated.Telefono);
        Assert.Equal("Administrador", updated.Rol);
        Assert.Equal("Edificio API", updated.EdificioNombre);

        using var get = new HttpRequestMessage(HttpMethod.Get, "/api/usuarios/me/perfil");
        get.Headers.Add("X-Test-User", "admin-api");
        get.Headers.Add("X-Test-Role", "Administrador");
        var persistedResponse = await api.Client.SendAsync(get);
        Assert.Equal(StatusCodes.Status200OK, (int)persistedResponse.StatusCode);
        var persisted = await persistedResponse.Content.ReadFromJsonAsync<PerfilUsuarioDto>();
        Assert.NotNull(persisted);
        Assert.Equal("Ada", persisted.Nombre);
        Assert.Equal("Nueva", persisted.Apellido);
        Assert.Equal("+54 11 5555-1010", persisted.Telefono);
        Assert.Equal("Administrador", persisted.Rol);
        Assert.Equal("Edificio API", persisted.EdificioNombre);

        using var otherUserRequest = new HttpRequestMessage(HttpMethod.Get, "/api/usuarios/me/perfil");
        otherUserRequest.Headers.Add("X-Test-User", "otro-api");
        otherUserRequest.Headers.Add("X-Test-Role", "Administrador");
        var otherUserResponse = await api.Client.SendAsync(otherUserRequest);
        Assert.Equal(StatusCodes.Status200OK, (int)otherUserResponse.StatusCode);
        var otherUserProfile = await otherUserResponse.Content.ReadFromJsonAsync<PerfilUsuarioDto>();
        Assert.NotNull(otherUserProfile);
        Assert.Equal("Otro", otherUserProfile.Nombre);
        Assert.Equal("Usuario", otherUserProfile.Apellido);
    }

    [Fact]
    public async Task Actualizacion_de_perfil_rechaza_sesion_ausente_cuenta_inactiva_y_datos_invalidos()
    {
        await using var api = await ApiFixture.CrearAsync();

        using var anonymous = new HttpRequestMessage(HttpMethod.Put, "/api/usuarios/me/perfil")
        {
            Content = JsonContent.Create(new { nombre = "Ana", apellido = "Pérez", telefono = (string?)null })
        };
        var anonymousResponse = await api.Client.SendAsync(anonymous);
        Assert.Equal(StatusCodes.Status401Unauthorized, (int)anonymousResponse.StatusCode);

        using var missingUser = new HttpRequestMessage(HttpMethod.Put, "/api/usuarios/me/perfil");
        missingUser.Headers.Add("X-Test-User", "usuario-no-existe");
        missingUser.Headers.Add("X-Test-Role", "Inquilino");
        missingUser.Content = JsonContent.Create(new { nombre = "Ana", apellido = "Pérez", telefono = (string?)null });
        var missingUserResponse = await api.Client.SendAsync(missingUser);
        Assert.Equal(StatusCodes.Status401Unauthorized, (int)missingUserResponse.StatusCode);

        using var inactive = new HttpRequestMessage(HttpMethod.Put, "/api/usuarios/me/perfil");
        inactive.Headers.Add("X-Test-User", "usuario-inactivo-api");
        inactive.Headers.Add("X-Test-Role", "Inquilino");
        inactive.Content = JsonContent.Create(new { nombre = "Ana", apellido = "Pérez", telefono = (string?)null });
        var inactiveResponse = await api.Client.SendAsync(inactive);
        Assert.Equal(StatusCodes.Status403Forbidden, (int)inactiveResponse.StatusCode);

        using var invalid = new HttpRequestMessage(HttpMethod.Put, "/api/usuarios/me/perfil");
        invalid.Headers.Add("X-Test-User", "admin-api");
        invalid.Headers.Add("X-Test-Role", "Administrador");
        invalid.Content = JsonContent.Create(new { nombre = " ", apellido = "Pérez", telefono = "no-es-un-teléfono" });
        var invalidResponse = await api.Client.SendAsync(invalid);
        Assert.Equal(StatusCodes.Status400BadRequest, (int)invalidResponse.StatusCode);
    }

    private sealed class ApiFixture : IAsyncDisposable
    {
        private readonly WebApplication _app;

        private ApiFixture(WebApplication app)
        {
            _app = app;
            Client = app.GetTestClient();
        }

        public HttpClient Client { get; }

        public static async Task<ApiFixture> CrearAsync()
        {
            var nombreBase = $"api-usuarios-comunidad-{Guid.NewGuid()}";
            var builder = WebApplication.CreateBuilder();
            builder.WebHost.UseTestServer();
            builder.Services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(nombreBase));
            builder.Services.AddIdentityCore<Usuario>()
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<AppDbContext>();
            builder.Services.AddAuthentication("test")
                .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>("test", _ => { });
            builder.Services.AddAuthorization();
            builder.Services.AddControllers()
                .AddApplicationPart(typeof(UsuariosController).Assembly);

            var app = builder.Build();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();
            await app.StartAsync();

            await using (var scope = app.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.Edificios.Add(new Edificio
                { IdEdificio = 1, Nombre = "Edificio API", Direccion = "Calle 1", Localidad = "Ciudad", Provincia = "Provincia", Estado = "Activo" });
                db.RolesAplicacion.Add(new Rol { IdRol = 1, Nombre = "Administrador" });
                db.Users.Add(new Usuario
                {
                    Id = "admin-api", UserName = "admin-api@example.com", NormalizedUserName = "ADMIN-API@EXAMPLE.COM",
                    Email = "admin-api@example.com", NormalizedEmail = "ADMIN-API@EXAMPLE.COM", Nombre = "Admin",
                    Apellido = "API", IdRol = 1, IdEdificio = 1, Estado = EstadoUsuario.Activo
                });
                db.Users.Add(new Usuario
                {
                    Id = "usuario-inactivo-api", UserName = "inactivo@example.com", NormalizedUserName = "INACTIVO@EXAMPLE.COM",
                    Email = "inactivo@example.com", NormalizedEmail = "INACTIVO@EXAMPLE.COM", Nombre = "Inactivo",
                    Apellido = "API", IdRol = 1, IdEdificio = 1, Estado = EstadoUsuario.Desactivado
                });
                db.Users.Add(new Usuario
                {
                    Id = "otro-api", UserName = "otro@example.com", NormalizedUserName = "OTRO@EXAMPLE.COM",
                    Email = "otro@example.com", NormalizedEmail = "OTRO@EXAMPLE.COM", Nombre = "Otro",
                    Apellido = "Usuario", IdRol = 1, IdEdificio = 1, Estado = EstadoUsuario.Activo
                });
                await db.SaveChangesAsync();
            }

            return new ApiFixture(app);
        }

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await _app.DisposeAsync();
        }
    }

    private sealed class TestAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var userId = Request.Headers["X-Test-User"].ToString();
            if (string.IsNullOrWhiteSpace(userId))
                return Task.FromResult(AuthenticateResult.NoResult());

            var role = Request.Headers["X-Test-Role"].ToString();
            var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, userId) };
            if (!string.IsNullOrWhiteSpace(role))
                claims.Add(new Claim(ClaimTypes.Role, role));
            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    private sealed class Fixture : IAsyncDisposable
    {
        private readonly ServiceProvider _services;
        private readonly AppDbContext _context;
        private readonly UserManager<Usuario> _userManager;

        private Fixture(ServiceProvider services)
        {
            _services = services;
            _context = services.GetRequiredService<AppDbContext>();
            _userManager = services.GetRequiredService<UserManager<Usuario>>();
        }

        public static async Task<Fixture> CrearAsync(bool incluirPersonas)
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase($"usuarios-comunidad-{Guid.NewGuid()}"));
            services.AddIdentityCore<Usuario>()
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<AppDbContext>();

            var fixture = new Fixture(services.BuildServiceProvider());
            await fixture.SeedAsync(incluirPersonas);
            return fixture;
        }

        public UsuariosController CrearController(string userId = "admin-edificio-a")
        {
            var controller = new UsuariosController(_context, _userManager);
            var httpContext = new DefaultHttpContext();
            httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, userId)], "test"));
            controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
            return controller;
        }

        private async Task SeedAsync(bool incluirPersonas)
        {
            _context.Edificios.AddRange(
                new Edificio { IdEdificio = 1, Nombre = "Edificio A", Direccion = "Calle 1", Localidad = "Ciudad", Provincia = "Provincia", Estado = "Activo" },
                new Edificio { IdEdificio = 2, Nombre = "Edificio B", Direccion = "Calle 2", Localidad = "Ciudad", Provincia = "Provincia", Estado = "Activo" });
            _context.RolesAplicacion.AddRange(
                new Rol { IdRol = 1, Nombre = "Administrador" },
                new Rol { IdRol = 2, Nombre = "Inquilino" },
                new Rol { IdRol = 3, Nombre = "Propietario" },
                new Rol { IdRol = 4, Nombre = "Portero" });
            _context.Users.Add(new Usuario
            {
                Id = "admin-edificio-a", UserName = "admin@example.com", NormalizedUserName = "ADMIN@EXAMPLE.COM",
                Email = "admin@example.com", NormalizedEmail = "ADMIN@EXAMPLE.COM", Nombre = "Ada", Apellido = "Admin",
                IdRol = 1, IdEdificio = 1, Estado = EstadoUsuario.Activo
            });

            if (incluirPersonas)
            {
                AgregarPersona("inquilino-a", "Inquilino", 2, 1);
                AgregarPersona("propietario-a", "Propietario", 3, 1);
                AgregarPersona("portero-a", "Portero", 4, 1);
                AgregarPersona("inquilino-otro-edificio", "Inquilino", 2, 2);
                AgregarPersona("admin-otro-rol", "Administrador", 1, 1);
                _context.RegistrosComunitarios.Add(new RegistroComunitario
                { IdUsuario = "inquilino-a", Perfil = "Inquilino", OrigenDeclaracion = "DeclaracionInquilino", ModalidadAlquiler = "Contrato", FechaRegistro = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc) });
                _context.RegistrosComunitarios.Add(new RegistroComunitario
                { IdUsuario = "portero-a", Perfil = "Personal", OrigenDeclaracion = "CuestionarioPersonal", FuncionPersonal = "Seguridad", HorarioPersonal = "Turno mañana" });
                _context.Unidades.Add(new Unidad { IdUnidad = 1, IdEdificio = 1, Piso = "4", Identificacion = "B" });
                _context.UsuariosUnidades.Add(new UsuarioUnidad { IdUsuarioUnidad = 1, IdUsuario = "propietario-a", IdUnidad = 1, TipoRelacion = "Propietario" });
                _context.DeclaracionesUnidadesComunitarias.Add(new DeclaracionUnidadComunitaria
                {
                    IdDeclaracionUnidad = 1, IdUsuario = "inquilino-a", IdEdificio = 1, Tipo = "Ocupacion",
                    PisoDeclarado = "4", IdentificacionDeclarada = "B", EsPrincipal = true, EstadoConfirmacion = "Declarada",
                    FechaDeclaracion = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc)
                });
                _context.DeclaracionesUnidadesComunitarias.Add(new DeclaracionUnidadComunitaria
                {
                    IdDeclaracionUnidad = 2, IdUsuario = "propietario-a", IdEdificio = 1, IdUnidad = 1,
                    Tipo = "Titularidad", PisoDeclarado = "4", IdentificacionDeclarada = "B",
                    EsPrincipal = true, EstaAlquilada = true, EstadoConfirmacion = "Pendiente",
                    FechaDeclaracion = new DateTime(2026, 1, 3, 3, 4, 5, DateTimeKind.Utc)
                });
            }

            await _context.SaveChangesAsync();
        }

        private void AgregarPersona(string id, string nombreRol, int idRol, int idEdificio)
        {
            _context.Users.Add(new Usuario
            {
                Id = id, UserName = $"{id}@example.com", NormalizedUserName = $"{id}@EXAMPLE.COM",
                Email = $"{id}@example.com", NormalizedEmail = $"{id}@EXAMPLE.COM",
                Nombre = nombreRol, Apellido = "Persona", IdRol = idRol, IdEdificio = idEdificio,
                Estado = EstadoUsuario.Activo, FechaRegistro = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc)
            });
        }

        public async ValueTask DisposeAsync()
        {
            await _context.DisposeAsync();
            await _services.DisposeAsync();
        }
    }
}
