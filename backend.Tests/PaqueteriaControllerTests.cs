using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VecinApp.Controllers;
using VecinApp.Data;
using VecinApp.Models;
using Xunit;

namespace VecinApp.Tests;

public sealed class PaqueteriaControllerTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void Endpoint_requires_authentication_and_only_allows_administrator_or_portero()
    {
        var controllerAuthorization = Assert.Single(
            typeof(PaqueteriaController).GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>());
        var method = typeof(PaqueteriaController).GetMethod(nameof(PaqueteriaController.ObtenerDestinatarios));
        Assert.NotNull(method);
        var actionAuthorization = Assert.Single(
            method!.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>());

        Assert.Null(controllerAuthorization.Roles);
        Assert.Equal("Administrador,Portero", actionAuthorization.Roles);
    }

    [Theory]
    [InlineData("admin-a", "Administrador")]
    [InlineData("portero-a", "Portero")]
    public async Task Administrador_y_portero_pueden_consultar_destinatarios(string userId, string role)
    {
        await using var api = await ApiFixture.CreateAsync();
        using var response = await api.GetDestinatariosAsync(userId, role);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("inquilino-a", "Inquilino")]
    [InlineData("propietario-a", "Propietario")]
    public async Task Residentes_no_pueden_consultar_el_selector(string userId, string role)
    {
        await using var api = await ApiFixture.CreateAsync();
        using var response = await api.GetDestinatariosAsync(userId, role);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Devuelve_activos_del_edificio_con_sus_declaraciones_sin_exigir_usuario_unidad()
    {
        await using var api = await ApiFixture.CreateAsync();
        using var response = await api.GetDestinatariosAsync("admin-a", "Administrador");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var destinatarios = document.RootElement.EnumerateArray().ToArray();

        Assert.Equal(2, destinatarios.Length);
        Assert.Equal(
            new[] { "inquilino-a", "propietario-a" },
            destinatarios.Select(persona => persona.GetProperty("id").GetString()).ToArray());

        var inquilino = destinatarios[0];
        Assert.False(inquilino.TryGetProperty("rol", out _));
        var declaraciones = inquilino.GetProperty("unidadesDeclaradas").EnumerateArray().ToArray();
        Assert.Equal(2, declaraciones.Length);
        var declaracion = declaraciones[0];
        Assert.Equal("3", declaracion.GetProperty("pisoDeclarado").GetString());
        Assert.Equal("B", declaracion.GetProperty("identificacionDeclarada").GetString());
        Assert.Equal("No verificada", declaracion.GetProperty("estadoConfirmacion").GetString());
        Assert.Empty(destinatarios[1].GetProperty("unidadesDeclaradas").EnumerateArray());
    }

    [Theory]
    [InlineData("admin-inactivo", "Administrador")]
    [InlineData("admin-sin-edificio", "Administrador")]
    public async Task Usuario_actual_inactivo_o_sin_edificio_es_rechazado(string userId, string role)
    {
        await using var api = await ApiFixture.CreateAsync();
        using var response = await api.GetDestinatariosAsync(userId, role);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public void Consultas_de_personas_y_declaraciones_se_traducen_a_sql_npgsql()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=translation_only;Username=test;Password=test")
            .Options;
        using var db = new AppDbContext(options);
        var rolesPermitidos = new[] { "Inquilino", "Propietario" };
        var personasSql = db.Users
            .AsNoTracking()
            .Where(persona =>
                persona.IdEdificio == 1 &&
                persona.Estado == EstadoUsuario.Activo &&
                persona.Rol != null &&
                rolesPermitidos.Contains(persona.Rol.Nombre))
            .OrderBy(persona => persona.Apellido)
            .ThenBy(persona => persona.Nombre)
            .Select(persona => new { persona.Id, persona.Nombre, persona.Apellido, Rol = persona.Rol!.Nombre })
            .ToQueryString();
        var idsPersonas = new[] { "inquilino-a", "propietario-a" };
        var declaracionesSql = db.DeclaracionesUnidadesComunitarias
            .AsNoTracking()
            .Where(declaracion =>
                declaracion.IdEdificio == 1 &&
                idsPersonas.Contains(declaracion.IdUsuario))
            .OrderBy(declaracion => declaracion.FechaDeclaracion)
            .Select(declaracion => new
            {
                declaracion.IdUsuario,
                declaracion.PisoDeclarado,
                declaracion.IdentificacionDeclarada,
                declaracion.EstadoConfirmacion
            })
            .ToQueryString();

        Assert.Contains("usuario", personasSql);
        Assert.Contains("rol", personasSql);
        Assert.Contains("id_edificio", personasSql);
        Assert.Contains("declaracion_unidad_comunitaria", declaracionesSql);
        Assert.Contains("id_usuario", declaracionesSql);
    }

    [Fact]
    public async Task Rechaza_solicitud_sin_autenticacion()
    {
        await using var api = await ApiFixture.CreateAsync();
        using var response = await api.Client.GetAsync("/api/paqueteria/destinatarios");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Personal_registra_paquete_para_residente_sin_unidad_y_el_backend_define_edificio_actor_y_fecha()
    {
        await using var api = await ApiFixture.CreateAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/paqueteria")
        {
            Content = JsonContent.Create(new { idUsuarioDestinatario = "propietario-a", idEdificio = 2, remitente = "Correo", identificacion = "Caja 24", observaciones = "Frágil" })
        };
        request.Headers.Add("X-Test-User", "portero-a");
        request.Headers.Add("X-Test-Role", "Portero");
        using var response = await api.Client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("Pendiente", document.RootElement.GetProperty("estado").GetString());
        Assert.Equal("Correo", document.RootElement.GetProperty("remitente").GetString());
        Assert.Equal("Caja 24", document.RootElement.GetProperty("identificacion").GetString());
        Assert.Equal("Frágil", document.RootElement.GetProperty("observaciones").GetString());
        Assert.True(document.RootElement.GetProperty("fechaRecepcion").GetDateTime() <= DateTime.UtcNow);
        await using var scope = api.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var saved = await db.Paquetes.SingleAsync(p => p.IdPaquete > 2);
        Assert.Equal(1, saved.IdEdificio);
        Assert.Null(saved.IdUnidad);
        Assert.Equal("portero-a", saved.IdUsuarioRegistro);
        Assert.Equal("propietario-a", saved.IdUsuarioDestinatario);
    }

    [Fact]
    public async Task Administrador_tambien_puede_registrar_paquetes()
    {
        await using var api = await ApiFixture.CreateAsync();
        using var response = await api.SendAsync(HttpMethod.Post, "/api/paqueteria", "admin-a", "Administrador",
            new { idUsuarioDestinatario = "inquilino-a", remitente = "Tienda", identificacion = "Bolsa" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await using var scope = api.Services.CreateAsyncScope();
        var saved = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Paquetes.SingleAsync(p => p.IdPaquete > 2);
        Assert.Equal("admin-a", saved.IdUsuarioRegistro);
    }

    [Theory]
    [InlineData("inquilino-b")]
    [InlineData("inquilino-inactivo")]
    [InlineData("admin-destinatario")]
    public async Task Alta_rechaza_destinatarios_de_otro_edificio_inactivos_o_de_rol_no_permitido(string recipientId)
    {
        await using var api = await ApiFixture.CreateAsync();
        using var response = await api.SendAsync(HttpMethod.Post, "/api/paqueteria", "portero-a", "Portero",
            new { idUsuarioDestinatario = recipientId, remitente = "Correo", identificacion = "Sobre" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Personal_solo_lista_paquetes_de_su_edificio_y_residente_solo_los_propios()
    {
        await using var api = await ApiFixture.CreateAsync();
        using var staff = await api.SendAsync(HttpMethod.Get, "/api/paqueteria", "admin-a", "Administrador");
        using var resident = await api.SendAsync(HttpMethod.Get, "/api/paqueteria/mis-paquetes", "inquilino-a", "Inquilino");
        Assert.Equal(HttpStatusCode.OK, staff.StatusCode);
        Assert.Equal(HttpStatusCode.OK, resident.StatusCode);
        using var staffJson = JsonDocument.Parse(await staff.Content.ReadAsStringAsync());
        using var residentJson = JsonDocument.Parse(await resident.Content.ReadAsStringAsync());
        Assert.Equal(new[] { 1 }, staffJson.RootElement.EnumerateArray().Select(x => x.GetProperty("id").GetInt32()).ToArray());
        Assert.Equal("inquilino-a", residentJson.RootElement[0].GetProperty("idUsuarioDestinatario").GetString());
    }

    [Fact]
    public async Task Entrega_fisica_registra_actor_y_no_confirma_el_paquete()
    {
        await using var api = await ApiFixture.CreateAsync();
        using var response = await api.SendAsync(HttpMethod.Post, "/api/paqueteria/1/entrega", "portero-a", "Portero");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await using var scope = api.Services.CreateAsyncScope();
        var saved = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Paquetes.SingleAsync(p => p.IdPaquete == 1);
        Assert.Equal("Entregado", saved.Estado);
        Assert.Equal("portero-a", saved.IdUsuarioEntrega);
        Assert.NotNull(saved.FechaEntrega);
        Assert.Null(saved.FechaConfirmacion);
    }

    [Fact]
    public async Task Residente_no_entrega_y_confirmacion_solo_funciona_despues_de_entrega_y_no_se_duplica()
    {
        await using var api = await ApiFixture.CreateAsync();
        using var early = await api.SendAsync(HttpMethod.Post, "/api/paqueteria/1/confirmacion", "inquilino-a", "Inquilino");
        Assert.Equal(HttpStatusCode.Conflict, early.StatusCode);
        using var residentDelivery = await api.SendAsync(HttpMethod.Post, "/api/paqueteria/1/entrega", "inquilino-a", "Inquilino");
        Assert.Equal(HttpStatusCode.Forbidden, residentDelivery.StatusCode);
        using var delivered = await api.SendAsync(HttpMethod.Post, "/api/paqueteria/1/entrega", "portero-a", "Portero");
        Assert.Equal(HttpStatusCode.NoContent, delivered.StatusCode);
        using var otherResident = await api.SendAsync(HttpMethod.Post, "/api/paqueteria/1/confirmacion", "propietario-a", "Propietario");
        Assert.Equal(HttpStatusCode.NotFound, otherResident.StatusCode);
        using var staffConfirmation = await api.SendAsync(HttpMethod.Post, "/api/paqueteria/1/confirmacion", "portero-a", "Portero");
        Assert.Equal(HttpStatusCode.Forbidden, staffConfirmation.StatusCode);
        using var confirmation = await api.SendAsync(HttpMethod.Post, "/api/paqueteria/1/confirmacion", "inquilino-a", "Inquilino");
        Assert.Equal(HttpStatusCode.NoContent, confirmation.StatusCode);
        using var duplicate = await api.SendAsync(HttpMethod.Post, "/api/paqueteria/1/confirmacion", "inquilino-a", "Inquilino");
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        await using var scope = api.Services.CreateAsyncScope();
        var saved = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Paquetes.SingleAsync(p => p.IdPaquete == 1);
        Assert.Equal("Confirmado", saved.Estado);
        Assert.NotNull(saved.FechaEntrega);
        Assert.NotNull(saved.FechaConfirmacion);
    }

    [Fact]
    public async Task Chat_persiste_mensajes_con_emisor_autenticado_y_aisla_paquete()
    {
        await using var api = await ApiFixture.CreateAsync();
        using var spoof = await api.SendAsync(HttpMethod.Post, "/api/paqueteria/1/mensajes", "inquilino-a", "Inquilino",
            new { contenido = "Estoy al tanto", idUsuarioEmisor = "admin-a" });
        Assert.Equal(HttpStatusCode.OK, spoof.StatusCode);
        using var asResident = await api.SendAsync(HttpMethod.Get, "/api/paqueteria/1/mensajes", "inquilino-a", "Inquilino");
        Assert.Equal(HttpStatusCode.OK, asResident.StatusCode);
        using var document = JsonDocument.Parse(await asResident.Content.ReadAsStringAsync());
        var message = Assert.Single(document.RootElement.EnumerateArray());
        Assert.Equal("Estoy al tanto", message.GetProperty("contenido").GetString());
        Assert.False(message.TryGetProperty("idEmisor", out _));
        using var otherResident = await api.SendAsync(HttpMethod.Get, "/api/paqueteria/1/mensajes", "propietario-a", "Propietario");
        Assert.Equal(HttpStatusCode.NotFound, otherResident.StatusCode);
        using var otherBuilding = await api.SendAsync(HttpMethod.Get, "/api/paqueteria/1/mensajes", "inquilino-b", "Inquilino");
        Assert.Equal(HttpStatusCode.NotFound, otherBuilding.StatusCode);
        using var staff = await api.SendAsync(HttpMethod.Get, "/api/paqueteria/1/mensajes", "portero-a", "Portero");
        Assert.Equal(HttpStatusCode.OK, staff.StatusCode);
        using var staffMessage = await api.SendAsync(HttpMethod.Post, "/api/paqueteria/1/mensajes", "portero-a", "Portero",
            new { contenido = "Queda registrado" });
        Assert.Equal(HttpStatusCode.OK, staffMessage.StatusCode);
        using var ordered = await api.SendAsync(HttpMethod.Get, "/api/paqueteria/1/mensajes", "inquilino-a", "Inquilino");
        using var orderedJson = JsonDocument.Parse(await ordered.Content.ReadAsStringAsync());
        var times = orderedJson.RootElement.EnumerateArray().Select(x => x.GetProperty("fechaEnvio").GetDateTime()).ToArray();
        Assert.Equal(times.Order().ToArray(), times);
        await using var scope = api.Services.CreateAsyncScope();
        var persisted = await scope.ServiceProvider.GetRequiredService<AppDbContext>().MensajesPaquete.FirstAsync();
        Assert.Equal("inquilino-a", persisted.IdUsuarioEmisor);
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

        public IServiceProvider Services => _app.Services;

        public static async Task<ApiFixture> CreateAsync()
        {
            var builder = WebApplication.CreateBuilder();
            builder.WebHost.UseTestServer();
            var databaseName = $"paqueteria-destinatarios-{Guid.NewGuid()}";
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(databaseName));
            builder.Services.AddIdentityCore<Usuario>()
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<AppDbContext>();
            builder.Services.AddAuthentication("test")
                .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>("test", _ => { });
            builder.Services.AddAuthorization();
            builder.Services.AddControllers()
                .AddApplicationPart(typeof(PaqueteriaController).Assembly);

            var app = builder.Build();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();
            await app.StartAsync();

            await using (var scope = app.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.Edificios.AddRange(
                    new Edificio { IdEdificio = 1, Nombre = "A", Direccion = "Calle 1", Localidad = "Ciudad", Provincia = "Provincia", Estado = "Activo" },
                    new Edificio { IdEdificio = 2, Nombre = "B", Direccion = "Calle 2", Localidad = "Ciudad", Provincia = "Provincia", Estado = "Activo" });
                db.RolesAplicacion.AddRange(
                    new Rol { IdRol = 1, Nombre = "Administrador" },
                    new Rol { IdRol = 2, Nombre = "Portero" },
                    new Rol { IdRol = 3, Nombre = "Inquilino" },
                    new Rol { IdRol = 4, Nombre = "Propietario" });
                db.Users.AddRange(
                    User("admin-a", 1, 1),
                    User("portero-a", 1, 2),
                    User("inquilino-a", 1, 3),
                    User("propietario-a", 1, 4),
                    User("inquilino-b", 2, 3),
                    User("inquilino-inactivo", 1, 3, EstadoUsuario.Desactivado),
                    User("admin-destinatario", 1, 1),
                    User("portero-destinatario", 1, 2),
                    User("admin-inactivo", 1, 1, EstadoUsuario.Desactivado),
                    User("admin-sin-edificio", null, 1));
                db.DeclaracionesUnidadesComunitarias.Add(new DeclaracionUnidadComunitaria
                {
                    IdDeclaracionUnidad = 1,
                    IdUsuario = "inquilino-a",
                    IdEdificio = 1,
                    Tipo = "Ocupacion",
                    PisoDeclarado = "3",
                    IdentificacionDeclarada = "B",
                    EstadoConfirmacion = "Declarada",
                    FechaDeclaracion = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc)
                });
                db.DeclaracionesUnidadesComunitarias.Add(new DeclaracionUnidadComunitaria
                {
                    IdDeclaracionUnidad = 2,
                    IdUsuario = "inquilino-a",
                    IdEdificio = 1,
                    Tipo = "Ocupacion",
                    PisoDeclarado = "4",
                    IdentificacionDeclarada = "C",
                    EstadoConfirmacion = "Pendiente",
                    FechaDeclaracion = new DateTime(2026, 1, 3, 3, 4, 5, DateTimeKind.Utc)
                });
                db.Paquetes.AddRange(
                    new Paquete { IdPaquete = 1, IdEdificio = 1, IdUsuarioDestinatario = "inquilino-a", IdUsuarioRegistro = "portero-a", Identificacion = "Caja 1", Remitente = "Correo", FechaRecepcion = DateTime.UtcNow, Estado = "Pendiente" },
                    new Paquete { IdPaquete = 2, IdEdificio = 2, IdUsuarioDestinatario = "inquilino-b", IdUsuarioRegistro = "portero-a", Identificacion = "Caja 2", Remitente = "Correo", FechaRecepcion = DateTime.UtcNow, Estado = "Pendiente" });
                // Deliberadamente no se crean relaciones UsuarioUnidad: no son requisito para Paquetería.
                await db.SaveChangesAsync();
            }

            return new ApiFixture(app);
        }

        public async Task<HttpResponseMessage> GetDestinatariosAsync(string userId, string role)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/api/paqueteria/destinatarios");
            request.Headers.Add("X-Test-User", userId);
            request.Headers.Add("X-Test-Role", role);
            return await Client.SendAsync(request);
        }

        public async Task<HttpResponseMessage> SendAsync(HttpMethod method, string path, string userId, string role, object? body = null)
        {
            using var request = new HttpRequestMessage(method, path);
            request.Headers.Add("X-Test-User", userId);
            request.Headers.Add("X-Test-Role", role);
            if (body is not null) request.Content = JsonContent.Create(body);
            return await Client.SendAsync(request);
        }

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await _app.DisposeAsync();
        }

        private static Usuario User(
            string id,
            int? buildingId,
            int roleId,
            EstadoUsuario status = EstadoUsuario.Activo) => new()
        {
            Id = id,
            UserName = $"{id}@example.test",
            NormalizedUserName = $"{id.ToUpperInvariant()}@EXAMPLE.TEST",
            Email = $"{id}@example.test",
            NormalizedEmail = $"{id.ToUpperInvariant()}@EXAMPLE.TEST",
            Nombre = id,
            Apellido = "Prueba",
            IdRol = roleId,
            IdEdificio = buildingId,
            Estado = status
        };
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
}
