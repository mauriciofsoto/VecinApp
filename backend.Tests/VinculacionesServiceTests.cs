using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VecinApp.Controllers;
using VecinApp.Data;
using VecinApp.DTOs;
using VecinApp.Models;
using VecinApp.Services;
using Xunit;

namespace VecinApp.Tests;

public sealed class VinculacionesServiceTests
{
    [Fact]
    public async Task Genera_una_solicitud_bilateral_y_notifica_sin_crear_relaciones_efectivas()
    {
        await using var fixture = await Fixture.CrearAsync(ambiguous: false);
        var service = new VinculacionesService(fixture.Db, fixture.Notificaciones);

        await service.EvaluarAsync("inquilino-1");
        await service.EvaluarAsync("propietario-1");

        var solicitud = Assert.Single(await fixture.Db.SolicitudesVinculacion.ToListAsync());
        Assert.Equal("Pendiente", solicitud.Estado);
        Assert.Equal("propietario-1", solicitud.IdPropietario);
        Assert.Equal("inquilino-1", solicitud.IdInquilino);
        Assert.False(solicitud.PropietarioAcepto);
        Assert.False(solicitud.InquilinoAcepto);
        Assert.Empty(await fixture.Db.UsuariosUnidades.ToListAsync());
        Assert.Equal(2, await fixture.Db.Notificaciones.CountAsync());
    }

    [Fact]
    public async Task No_genera_solicitud_si_el_nombre_parcial_deja_dos_propietarios_candidatos()
    {
        await using var fixture = await Fixture.CrearAsync(ambiguous: true);
        var service = new VinculacionesService(fixture.Db, fixture.Notificaciones);

        await service.EvaluarAsync("inquilino-1");

        Assert.Empty(await fixture.Db.SolicitudesVinculacion.ToListAsync());
        Assert.Empty(await fixture.Db.Notificaciones.ToListAsync());
    }

    [Fact]
    public async Task Crea_relaciones_solo_despues_de_que_ambas_partes_aceptan_y_bloquea_respuestas_repetidas()
    {
        await using var fixture = await Fixture.CrearAsync(ambiguous: false);
        var solicitud = await fixture.GenerarSolicitudAsync();

        var primera = await fixture.Controlador("propietario-1", "Propietario").Responder(
            solicitud.IdSolicitudVinculacion, new ResponderVinculacionRequest { Acepta = true }, CancellationToken.None);
        Assert.IsType<OkObjectResult>(primera);
        Assert.Equal("Pendiente", solicitud.Estado);
        Assert.Empty(await fixture.Db.UsuariosUnidades.ToListAsync());

        var segunda = await fixture.Controlador("inquilino-1", "Inquilino").Responder(
            solicitud.IdSolicitudVinculacion, new ResponderVinculacionRequest { Acepta = true }, CancellationToken.None);
        Assert.IsType<OkObjectResult>(segunda);
        Assert.Equal("Confirmada", solicitud.Estado);
        Assert.NotNull(solicitud.FechaConfirmacion);
        Assert.Equal(new[] { "Inquilino", "Propietario" },
            (await fixture.Db.UsuariosUnidades.OrderBy(u => u.TipoRelacion).Select(u => u.TipoRelacion).ToListAsync()).ToArray());

        var repetida = await fixture.Controlador("propietario-1", "Propietario").Responder(
            solicitud.IdSolicitudVinculacion, new ResponderVinculacionRequest { Acepta = true }, CancellationToken.None);
        Assert.IsType<ConflictObjectResult>(repetida);
    }

    [Fact]
    public async Task El_rechazo_registra_el_caso_y_notifica_a_la_otra_parte_y_a_administracion()
    {
        await using var fixture = await Fixture.CrearAsync(ambiguous: false);
        var solicitud = await fixture.GenerarSolicitudAsync();

        var resultado = await fixture.Controlador("inquilino-1", "Inquilino").Responder(
            solicitud.IdSolicitudVinculacion,
            new ResponderVinculacionRequest { Acepta = false, Motivo = "No corresponde" },
            CancellationToken.None);

        Assert.IsType<OkObjectResult>(resultado);
        Assert.Equal("Rechazada", solicitud.Estado);
        Assert.Equal("inquilino-1", solicitud.IdUsuarioRechazo);
        Assert.Equal("No corresponde", solicitud.MotivoRechazo);
        Assert.NotNull(solicitud.FechaRechazo);
        Assert.Empty(await fixture.Db.UsuariosUnidades.ToListAsync());
        Assert.True(await fixture.Db.Notificaciones.AnyAsync(n => n.IdUsuario == "propietario-1" && n.Titulo == "Vinculación pendiente de revisión"));
        Assert.True(await fixture.Db.Notificaciones.AnyAsync(n => n.IdUsuario == "admin-1" && n.Titulo == "Desacuerdo en una vinculación"));
    }

    [Fact]
    public async Task Usuario_ajeno_o_inactivo_no_puede_responder_la_solicitud()
    {
        await using var fixture = await Fixture.CrearAsync(ambiguous: false);
        var solicitud = await fixture.GenerarSolicitudAsync();

        var ajeno = await fixture.Controlador("propietario-ajeno", "Propietario").Responder(
            solicitud.IdSolicitudVinculacion, new ResponderVinculacionRequest { Acepta = true }, CancellationToken.None);
        Assert.IsType<ConflictObjectResult>(ajeno);

        var inquilino = await fixture.Db.Users.SingleAsync(u => u.Id == "inquilino-1");
        inquilino.Estado = EstadoUsuario.Desactivado;
        await fixture.Db.SaveChangesAsync();
        var inactivo = await fixture.Controlador("inquilino-1", "Inquilino").Responder(
            solicitud.IdSolicitudVinculacion, new ResponderVinculacionRequest { Acepta = true }, CancellationToken.None);
        Assert.IsType<ForbidResult>(inactivo);
        Assert.Equal("Pendiente", solicitud.Estado);
        Assert.Empty(await fixture.Db.UsuariosUnidades.ToListAsync());
    }

    private sealed class Fixture : IAsyncDisposable
    {
        private readonly IServiceProvider _provider;
        private readonly IServiceScope _scope;
        private readonly UserManager<Usuario> _users;
        public AppDbContext Db { get; }
        public NotificacionesService Notificaciones { get; }

        private Fixture(IServiceProvider provider, IServiceScope scope)
        {
            _provider = provider;
            _scope = scope;
            Db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            _users = scope.ServiceProvider.GetRequiredService<UserManager<Usuario>>();
            Notificaciones = new NotificacionesService(Db);
        }

        public static async Task<Fixture> CrearAsync(bool ambiguous)
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase($"vinculaciones-{Guid.NewGuid()}"));
            services.AddIdentityCore<Usuario>().AddRoles<IdentityRole>().AddEntityFrameworkStores<AppDbContext>();
            var provider = services.BuildServiceProvider();
            var scope = provider.CreateScope();
            var fixture = new Fixture(provider, scope);

            var edificio = new Edificio { IdEdificio = 1, Nombre = "Torre A", Direccion = "Calle 1", Localidad = "CABA", Provincia = "CABA", Estado = "Activo" };
            var rolAdministrador = new Rol { IdRol = 1, Nombre = "Administrador" };
            var rolPropietario = new Rol { IdRol = 2, Nombre = "Propietario" };
            var rolInquilino = new Rol { IdRol = 3, Nombre = "Inquilino" };
            var unidad = new Unidad { IdUnidad = 10, IdEdificio = 1, Piso = "6", Identificacion = "A", Edificio = edificio };
            var propietario = CrearUsuario("propietario-1", "Marta", "Sosa", rolPropietario, edificio);
            var inquilino = CrearUsuario("inquilino-1", "Sofía", "Luna", rolInquilino, edificio);
            var administrador = CrearUsuario("admin-1", "Ada", "Admin", rolAdministrador, edificio);
            var propietarioAjeno = CrearUsuario("propietario-ajeno", "Juan", "Paz", rolPropietario, edificio);
            fixture.Db.AddRange(edificio, rolAdministrador, rolPropietario, rolInquilino, unidad,
                propietario, inquilino, administrador, propietarioAjeno);
            if (ambiguous)
            {
                var propietarioDos = CrearUsuario("propietario-2", "Marta", "Sosa", rolPropietario, edificio);
                fixture.Db.Users.Add(propietarioDos);
                fixture.Db.DeclaracionesUnidadesComunitarias.Add(new DeclaracionUnidadComunitaria
                {
                    IdUsuario = propietarioDos.Id, IdEdificio = 1, IdUnidad = 10,
                    Tipo = "Titularidad", EstaAlquilada = true, EstadoConfirmacion = "Declarada",
                    PersonaRelacionNombre = "Sofía", PersonaRelacionApellido = "Luna", Unidad = unidad,
                    Usuario = propietarioDos, Edificio = edificio
                });
            }
            fixture.Db.DeclaracionesUnidadesComunitarias.AddRange(
                new DeclaracionUnidadComunitaria
                {
                    IdUsuario = propietario.Id, IdEdificio = 1, IdUnidad = 10,
                    Tipo = "Titularidad", EstaAlquilada = true, EstadoConfirmacion = "Declarada",
                    PersonaRelacionNombre = "Sofía", PersonaRelacionApellido = "Luna",
                    Unidad = unidad, Usuario = propietario, Edificio = edificio
                },
                new DeclaracionUnidadComunitaria
                {
                    IdUsuario = inquilino.Id, IdEdificio = 1, IdUnidad = 10,
                    Tipo = "Ocupacion", EstadoConfirmacion = "Declarada",
                    PersonaRelacionNombre = "Marta", Unidad = unidad, Usuario = inquilino, Edificio = edificio
                });
            await fixture.Db.SaveChangesAsync();
            return fixture;
        }

        public async Task<SolicitudVinculacion> GenerarSolicitudAsync()
        {
            await new VinculacionesService(Db, Notificaciones).EvaluarAsync("inquilino-1");
            return await Db.SolicitudesVinculacion.SingleAsync();
        }

        public VinculacionesController Controlador(string userId, string role)
        {
            var controller = new VinculacionesController(Db, _users,
                new VinculacionesService(Db, Notificaciones), Notificaciones);
            var identity = new ClaimsIdentity([
                new Claim(ClaimTypes.NameIdentifier, userId), new Claim(ClaimTypes.Role, role)
            ], "test");
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
            };
            return controller;
        }

        private static Usuario CrearUsuario(string id, string nombre, string apellido, Rol rol, Edificio edificio) => new()
        {
            Id = id, UserName = $"{id}@example.test", NormalizedUserName = $"{id}@EXAMPLE.TEST",
            Email = $"{id}@example.test", NormalizedEmail = $"{id}@EXAMPLE.TEST",
            Nombre = nombre, Apellido = apellido, IdRol = rol.IdRol, Rol = rol,
            IdEdificio = edificio.IdEdificio, Edificio = edificio, Estado = EstadoUsuario.Activo,
            FechaRegistro = DateTime.UtcNow
        };

        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
            _scope.Dispose();
            if (_provider is IDisposable disposable) disposable.Dispose();
        }
    }
}
