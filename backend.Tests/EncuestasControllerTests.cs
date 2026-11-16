using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Controllers;
using VecinApp.Data;
using VecinApp.Models;
using Xunit;

namespace VecinApp.Tests;

public sealed class EncuestasControllerTests
{
    [Fact]
    public async Task Administracion_crea_encuesta_y_publicacion_en_una_operacion()
    {
        await using var fixture = await Fixture.CrearAsync();
        var resultado = await fixture.Controlador("Administrador").CrearEncuesta(
            fixture.Request(), CancellationToken.None);

        Assert.IsType<CreatedAtActionResult>(resultado.Result);
        var encuesta = await fixture.Db.Encuestas
            .Include(item => item.Publicacion)
            .Include(item => item.Opciones)
            .SingleAsync();
        Assert.Equal("Encuesta de prueba", encuesta.Publicacion.Titulo);
        Assert.Equal("encuesta", encuesta.Publicacion.CategoriaPublicacion.Nombre);
        Assert.Equal(2, encuesta.Opciones.Count);
    }

    [Fact]
    public async Task Vecino_no_puede_crear_encuestas()
    {
        await using var fixture = await Fixture.CrearAsync();
        var resultado = await fixture.Controlador("Propietario").CrearEncuesta(
            fixture.Request(), CancellationToken.None);

        Assert.IsType<ForbidResult>(resultado.Result);
        Assert.Empty(await fixture.Db.Encuestas.ToListAsync());
    }

    [Fact]
    public async Task Voto_es_individual_y_se_rechaza_un_segundo_voto_del_mismo_usuario()
    {
        await using var fixture = await Fixture.CrearAsync();
        var encuesta = await fixture.CrearEncuestaAsync();
        var opcionId = encuesta.Opciones.First().IdOpcion;
        var propietario = fixture.Controlador("Propietario");
        var inquilino = fixture.Controlador("Inquilino");

        Assert.IsType<OkObjectResult>((await propietario.RegistrarVoto(
            encuesta.IdEncuesta, new RegistrarVotoEncuestaRequest { IdOpcion = opcionId },
            CancellationToken.None)).Result);
        Assert.IsType<ConflictObjectResult>((await propietario.RegistrarVoto(
            encuesta.IdEncuesta, new RegistrarVotoEncuestaRequest { IdOpcion = opcionId },
            CancellationToken.None)).Result);
        Assert.IsType<OkObjectResult>((await inquilino.RegistrarVoto(
            encuesta.IdEncuesta, new RegistrarVotoEncuestaRequest { IdOpcion = opcionId },
            CancellationToken.None)).Result);

        Assert.Equal(2, await fixture.Db.RespuestasEncuesta.CountAsync());
        Assert.Contains(await fixture.Db.RespuestasEncuesta.ToListAsync(), respuesta =>
            respuesta.IdUsuario == fixture.PropietarioId && respuesta.IdOpcion == opcionId);
        Assert.Contains(await fixture.Db.RespuestasEncuesta.ToListAsync(), respuesta =>
            respuesta.IdUsuario == fixture.InquilinoId && respuesta.IdOpcion == opcionId);
    }

    [Fact]
    public async Task Consulta_muestra_voto_propio_y_resultados_sin_filtrar_a_otros_vecinos()
    {
        await using var fixture = await Fixture.CrearAsync();
        var encuesta = await fixture.CrearEncuestaAsync();
        var opciones = encuesta.Opciones.OrderBy(opcion => opcion.IdOpcion).ToArray();
        await fixture.Controlador("Propietario").RegistrarVoto(
            encuesta.IdEncuesta, new RegistrarVotoEncuestaRequest { IdOpcion = opciones[0].IdOpcion },
            CancellationToken.None);

        var votante = await fixture.Controlador("Propietario").ObtenerEncuestas(CancellationToken.None);
        var otroVecino = await fixture.Controlador("Inquilino").ObtenerEncuestas(CancellationToken.None);
        var encuestaVotante = Assert.Single(Assert.IsType<OkObjectResult>(votante.Result).Value as IEnumerable<EncuestaResponseDto> ?? []);
        var encuestaOtroVecino = Assert.Single(Assert.IsType<OkObjectResult>(otroVecino.Result).Value as IEnumerable<EncuestaResponseDto> ?? []);

        Assert.True(encuestaVotante.YaVote);
        Assert.False(encuestaOtroVecino.YaVote);
        Assert.Equal(opciones[0].IdOpcion, encuestaVotante.MiOpcionId);
        Assert.Null(encuestaOtroVecino.MiOpcionId);
        Assert.Equal(1, encuestaVotante.TotalVotos);
        Assert.Equal(1, encuestaOtroVecino.TotalVotos);

        await fixture.Controlador("Inquilino").RegistrarVoto(
            encuesta.IdEncuesta,
            new RegistrarVotoEncuestaRequest { IdOpcion = opciones[1].IdOpcion },
            CancellationToken.None);
        var votoInquilino = await fixture.Controlador("Inquilino").ObtenerEncuestas(CancellationToken.None);
        var votoPropietario = await fixture.Controlador("Propietario").ObtenerEncuestas(CancellationToken.None);
        var encuestaInquilino = Assert.Single(Assert.IsType<OkObjectResult>(votoInquilino.Result).Value as IEnumerable<EncuestaResponseDto> ?? []);
        encuestaVotante = Assert.Single(Assert.IsType<OkObjectResult>(votoPropietario.Result).Value as IEnumerable<EncuestaResponseDto> ?? []);

        Assert.True(encuestaInquilino.YaVote);
        Assert.Equal(opciones[1].IdOpcion, encuestaInquilino.MiOpcionId);
        Assert.True(encuestaVotante.YaVote);
        Assert.Equal(opciones[0].IdOpcion, encuestaVotante.MiOpcionId);
    }

    [Fact]
    public async Task Encuesta_de_otro_edificio_no_se_consulta_ni_se_vota()
    {
        await using var fixture = await Fixture.CrearAsync();
        var encuesta = await fixture.CrearEncuestaAsync();
        var usuarioOtroEdificio = fixture.Controlador("Propietario", edificioId: 2);

        var lista = await usuarioOtroEdificio.ObtenerEncuestas(CancellationToken.None);
        var voto = await usuarioOtroEdificio.RegistrarVoto(
            encuesta.IdEncuesta,
            new RegistrarVotoEncuestaRequest { IdOpcion = encuesta.Opciones.First().IdOpcion },
            CancellationToken.None);

        Assert.Empty(Assert.IsType<OkObjectResult>(lista.Result).Value as IEnumerable<EncuestaResponseDto> ?? []);
        Assert.IsType<NotFoundObjectResult>(voto.Result);
    }

    [Fact]
    public async Task Encuesta_cerrada_no_admite_votos()
    {
        await using var fixture = await Fixture.CrearAsync();
        var encuesta = await fixture.CrearEncuestaAsync();
        Assert.IsType<NoContentResult>(await fixture.Controlador("Administrador")
            .CerrarEncuesta(encuesta.IdEncuesta, CancellationToken.None));

        var resultado = await fixture.Controlador("Propietario").RegistrarVoto(
            encuesta.IdEncuesta,
            new RegistrarVotoEncuestaRequest { IdOpcion = encuesta.Opciones.First().IdOpcion },
            CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(resultado.Result);
    }

    [Fact]
    public async Task Cuenta_inactiva_y_portero_no_pueden_operar()
    {
        await using var fixture = await Fixture.CrearAsync();
        var cuentaInactiva = fixture.Controlador("Propietario", EstadoUsuario.Desactivado);
        var portero = fixture.Controlador("Portero");

        var inactivo = await cuentaInactiva.ObtenerEncuestas(CancellationToken.None);
        var noAutorizado = await portero.ObtenerEncuestas(CancellationToken.None);

        Assert.IsType<ForbidResult>(inactivo.Result);
        Assert.IsType<ForbidResult>(noAutorizado.Result);
    }

    [Fact]
    public async Task Administracion_consulta_personas_opciones_y_fechas_de_voto()
    {
        await using var fixture = await Fixture.CrearAsync();
        var encuesta = await fixture.CrearEncuestaAsync();
        var opciones = encuesta.Opciones.OrderBy(opcion => opcion.IdOpcion).ToArray();

        await fixture.Controlador("Propietario").RegistrarVoto(
            encuesta.IdEncuesta,
            new RegistrarVotoEncuestaRequest { IdOpcion = opciones[0].IdOpcion },
            CancellationToken.None);
        await fixture.Controlador("Inquilino").RegistrarVoto(
            encuesta.IdEncuesta,
            new RegistrarVotoEncuestaRequest { IdOpcion = opciones[1].IdOpcion },
            CancellationToken.None);

        var action = await fixture.Controlador("Administrador").ObtenerVotantes(
            encuesta.IdEncuesta, CancellationToken.None);
        var resultado = Assert.IsType<EncuestaVotantesResponseDto>(
            Assert.IsType<OkObjectResult>(action.Result).Value);

        Assert.Equal("Encuesta de prueba", resultado.Titulo);
        Assert.Equal(2, resultado.TotalVotos);
        Assert.Collection(
            resultado.Votantes,
            votante =>
            {
                Assert.Equal("Ana Propietaria", votante.Nombre);
                Assert.Equal(opciones[0].Texto, votante.Opcion);
                Assert.NotEqual(default, votante.FechaVoto);
            },
            votante =>
            {
                Assert.Equal("Luis Inquilino", votante.Nombre);
                Assert.Equal(opciones[1].Texto, votante.Opcion);
                Assert.NotEqual(default, votante.FechaVoto);
            });
    }

    [Fact]
    public async Task Encuesta_sin_votos_devuelve_lista_vacia_y_total_cero()
    {
        await using var fixture = await Fixture.CrearAsync();
        var encuesta = await fixture.CrearEncuestaAsync();

        var action = await fixture.Controlador("Administrador").ObtenerVotantes(
            encuesta.IdEncuesta, CancellationToken.None);
        var resultado = Assert.IsType<EncuestaVotantesResponseDto>(
            Assert.IsType<OkObjectResult>(action.Result).Value);

        Assert.Equal(0, resultado.TotalVotos);
        Assert.Empty(resultado.Votantes);
    }

    [Fact]
    public async Task Historial_de_votantes_sigue_disponible_despues_de_cerrar_la_encuesta()
    {
        await using var fixture = await Fixture.CrearAsync();
        var encuesta = await fixture.CrearEncuestaAsync();
        await fixture.Controlador("Propietario").RegistrarVoto(
            encuesta.IdEncuesta,
            new RegistrarVotoEncuestaRequest { IdOpcion = encuesta.Opciones.First().IdOpcion },
            CancellationToken.None);
        await fixture.Controlador("Administrador").CerrarEncuesta(
            encuesta.IdEncuesta, CancellationToken.None);

        var action = await fixture.Controlador("Administrador").ObtenerVotantes(
            encuesta.IdEncuesta, CancellationToken.None);
        var resultado = Assert.IsType<EncuestaVotantesResponseDto>(
            Assert.IsType<OkObjectResult>(action.Result).Value);

        Assert.Equal("cerrada", resultado.Estado);
        Assert.Single(resultado.Votantes);
    }

    [Theory]
    [InlineData("Propietario")]
    [InlineData("Inquilino")]
    [InlineData("Portero")]
    public async Task Residente_y_portero_no_pueden_consultar_identidad_de_votantes(string rol)
    {
        await using var fixture = await Fixture.CrearAsync();
        var encuesta = await fixture.CrearEncuestaAsync();

        var action = await fixture.Controlador(rol).ObtenerVotantes(
            encuesta.IdEncuesta, CancellationToken.None);

        Assert.IsType<ForbidResult>(action.Result);
    }

    [Fact]
    public async Task Consulta_de_votantes_restringe_estado_activo_y_edificio()
    {
        await using var fixture = await Fixture.CrearAsync();
        var encuesta = await fixture.CrearEncuestaAsync();

        var inactivo = await fixture.Controlador("Administrador", EstadoUsuario.Desactivado)
            .ObtenerVotantes(encuesta.IdEncuesta, CancellationToken.None);
        var otroEdificio = await fixture.Controlador("Administrador", edificioId: 2)
            .ObtenerVotantes(encuesta.IdEncuesta, CancellationToken.None);

        Assert.IsType<ForbidResult>(inactivo.Result);
        Assert.IsType<NotFoundObjectResult>(otroEdificio.Result);
    }

    [Fact]
    public async Task Superadministrador_conserva_el_acceso_administrativo_actual()
    {
        await using var fixture = await Fixture.CrearAsync();
        var encuesta = await fixture.CrearEncuestaAsync();

        var action = await fixture.Controlador("SuperAdministrador").ObtenerVotantes(
            encuesta.IdEncuesta, CancellationToken.None);

        Assert.IsType<OkObjectResult>(action.Result);
    }

    private sealed class Fixture : IAsyncDisposable
    {
        private readonly string _adminId = $"admin-{Guid.NewGuid():N}";
        private readonly string _superAdminId = $"superadmin-{Guid.NewGuid():N}";
        private readonly string _propietarioId = $"propietario-{Guid.NewGuid():N}";
        private readonly string _inquilinoId = $"inquilino-{Guid.NewGuid():N}";
        private readonly string _porteroId = $"portero-{Guid.NewGuid():N}";

        public AppDbContext Db { get; }
        public string PropietarioId => _propietarioId;
        public string InquilinoId => _inquilinoId;

        private Fixture(AppDbContext db) => Db = db;

        public static async Task<Fixture> CrearAsync()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase($"Encuestas-{Guid.NewGuid():N}")
                .Options;
            var fixture = new Fixture(new AppDbContext(options));
            var roles = new[]
            {
                new Rol { IdRol = 1, Nombre = "Administrador" },
                new Rol { IdRol = 2, Nombre = "Propietario" },
                new Rol { IdRol = 3, Nombre = "Inquilino" },
                new Rol { IdRol = 4, Nombre = "Portero" },
                new Rol { IdRol = 5, Nombre = "SuperAdministrador" }
            };
            var edificio = new Edificio
            {
                IdEdificio = 1,
                Nombre = "Edificio de prueba",
                Direccion = "Calle 1",
                Estado = "Activo"
            };
            var otroEdificio = new Edificio
            {
                IdEdificio = 2,
                Nombre = "Otro edificio",
                Direccion = "Calle 2",
                Estado = "Activo"
            };
            fixture.Db.RolesAplicacion.AddRange(roles);
            fixture.Db.Edificios.AddRange(edificio, otroEdificio);
            fixture.Db.CategoriasPublicacion.Add(new CategoriaPublicacion
            {
                IdCategoriaPublicacion = 1,
                Nombre = "encuesta"
            });
            fixture.Db.Users.AddRange(
                Usuario(fixture._adminId, roles[0], EstadoUsuario.Activo, 1),
                Usuario(fixture._propietarioId, roles[1], EstadoUsuario.Activo, 1),
                Usuario(fixture._inquilinoId, roles[2], EstadoUsuario.Activo, 1),
                Usuario(fixture._porteroId, roles[3], EstadoUsuario.Activo, 1),
                Usuario(fixture._superAdminId, roles[4], EstadoUsuario.Activo, 1));
            await fixture.Db.SaveChangesAsync();
            return fixture;
        }

        public CrearEncuestaRequest Request() => new()
        {
            Titulo = "Encuesta de prueba",
            Descripcion = "Descripción",
            Opciones = ["Opción A", "Opción B"]
        };

        public async Task<Encuesta> CrearEncuestaAsync()
        {
            var action = await Controlador("Administrador").CrearEncuesta(
                Request(), CancellationToken.None);
            Assert.IsType<CreatedAtActionResult>(action.Result);
            return await Db.Encuestas.Include(item => item.Opciones).SingleAsync();
        }

        public EncuestasController Controlador(
            string rol,
            EstadoUsuario estado = EstadoUsuario.Activo,
            int edificioId = 1)
        {
            var id = rol switch
            {
                "Administrador" when estado == EstadoUsuario.Desactivado => $"disabled-{_adminId}",
                "Administrador" => _adminId,
                "Propietario" when estado == EstadoUsuario.Desactivado => $"disabled-{_propietarioId}",
                "Propietario" => _propietarioId,
                "Inquilino" => _inquilinoId,
                "Portero" => _porteroId,
                "SuperAdministrador" => _superAdminId,
                _ => throw new ArgumentOutOfRangeException(nameof(rol))
            };
            if (edificioId != 1)
            {
                id = $"usuario-edificio-{edificioId}-{Guid.NewGuid():N}";
                var rolUsuario = Db.RolesAplicacion.Single(item => item.Nombre == rol);
                Db.Users.Add(Usuario(id, rolUsuario, estado, edificioId));
                Db.SaveChanges();
            }
            else if (id.StartsWith("disabled-", StringComparison.Ordinal))
            {
                var rolUsuario = Db.RolesAplicacion.Single(item => item.Nombre == rol);
                var disabled = Usuario(id, rolUsuario, estado, edificioId);
                Db.Users.Add(disabled);
                Db.SaveChanges();
            }

            var controller = new EncuestasController(Db)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = new ClaimsPrincipal(new ClaimsIdentity(
                            [new Claim(ClaimTypes.NameIdentifier, id)], "test"))
                    }
                }
            };
            return controller;
        }

        private static Usuario Usuario(string id, Rol rol, EstadoUsuario estado, int edificioId)
        {
            var (nombre, apellido) = rol.Nombre switch
            {
                "Propietario" => ("Ana", "Propietaria"),
                "Inquilino" => ("Luis", "Inquilino"),
                _ => ("Usuario", "Prueba")
            };
            return new Usuario
            {
                Id = id,
                UserName = id,
                Email = $"{id}@vecinapp.local",
                Nombre = nombre,
                Apellido = apellido,
                Estado = estado,
                IdRol = rol.IdRol,
                Rol = rol,
                IdEdificio = edificioId
            };
        }

        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }
}
