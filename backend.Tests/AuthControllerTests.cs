using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using VecinApp.Controllers;
using VecinApp.Data;
using VecinApp.DTOs;
using VecinApp.Models;
using VecinApp.Services;
using Xunit;

namespace VecinApp.Tests;

public sealed class AuthControllerTests
{
    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task Refresh_rechaza_tokens_expirados_o_revocados(bool expired, bool revoked)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"auth-refresh-invalid-{Guid.NewGuid():N}")
            .Options;
        await using var db = new AppDbContext(options);
        var user = new Usuario
        {
            Id = "usuario-activo",
            UserName = "usuario-activo",
            NormalizedUserName = "USUARIO-ACTIVO",
            Email = "active@example.test",
            NormalizedEmail = "ACTIVE@EXAMPLE.TEST",
            Estado = EstadoUsuario.Activo,
        };
        db.Users.Add(user);
        db.RefreshTokens.Add(new RefreshToken
        {
            Token = "refresh-token-invalido",
            UserId = user.Id,
            User = user,
            ExpiresAt = expired ? DateTime.UtcNow.AddMinutes(-1) : DateTime.UtcNow.AddDays(1),
            IsRevoked = revoked,
        });
        await db.SaveChangesAsync();
        var controller = CreateController(db);

        var result = await controller.Refresh(new RefreshRequest("refresh-token-invalido"));

        Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal(revoked, (await db.RefreshTokens.SingleAsync()).IsRevoked);
    }

    [Fact]
    public async Task Refresh_revoca_el_token_y_rechaza_cuentas_deshabilitadas()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"auth-refresh-{Guid.NewGuid():N}")
            .Options;
        await using var db = new AppDbContext(options);
        var user = new Usuario
        {
            Id = "usuario-deshabilitado",
            UserName = "usuario-deshabilitado",
            NormalizedUserName = "USUARIO-DESHABILITADO",
            Email = "disabled@example.test",
            NormalizedEmail = "DISABLED@EXAMPLE.TEST",
            Estado = EstadoUsuario.Desactivado,
        };
        db.Users.Add(user);
        db.RefreshTokens.Add(new RefreshToken
        {
            Token = "refresh-token-de-prueba",
            UserId = user.Id,
            User = user,
            ExpiresAt = DateTime.UtcNow.AddDays(1),
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.Refresh(new RefreshRequest("refresh-token-de-prueba"));

        Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.True((await db.RefreshTokens.SingleAsync()).IsRevoked);
    }

    [Fact]
    public async Task Registro_solo_valida_payload_camel_case_sin_datos_personales_ni_consumirlo()
    {
        await using var db = CrearDb("invite-valid");
        await PrepararInvitacion(db, "Administrador");
        var controller = CreateController(db);
        var request = JsonSerializer.Deserialize<RegistroRequest>(
            """{"codigoInvitacion":" inv-admin ","rolEsperado":"Administrador","soloValidar":true}""",
            new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new InvalidOperationException("No se pudo deserializar el request de prueba.");

        var result = await controller.Registro(request);

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(0, (await db.CodigosInvitacion.SingleAsync()).UsosRealizados);
    }

    [Fact]
    public async Task Registro_final_sigue_exigiendo_datos_personales()
    {
        await using var db = CrearDb("invite-final-required-fields");
        await PrepararInvitacion(db, "Administrador");
        var controller = CreateController(db);

        var result = await controller.Registro(new RegistroRequest
        {
            CodigoInvitacion = "INV-ADMIN",
            RolEsperado = "Administrador",
            SoloValidar = false,
        });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(0, (await db.CodigosInvitacion.SingleAsync()).UsosRealizados);
    }

    [Fact]
    public async Task Registro_administrador_sin_rol_esperado_rechaza_edificio_inactivo()
    {
        var dbName = $"auth-invite-admin-inactive-without-expected-role-{Guid.NewGuid():N}";
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(dbName));
        services.AddIdentity<Usuario, IdentityRole>()
            .AddEntityFrameworkStores<AppDbContext>();
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await PrepararInvitacion(db, "Administrador", "inactive-building");
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<Usuario>>();
        var controller = new AuthController(userManager, null!, db, CrearTokenService(), null!, null!);

        var result = await controller.Registro(new RegistroRequest
        {
            Nombre = "Ana",
            Apellido = "Pérez",
            Email = "ana@example.test",
            Password = "Clave123",
            CodigoInvitacion = "INV-ADMIN",
        });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(0, (await db.CodigosInvitacion.SingleAsync()).UsosRealizados);
    }

    [Theory]
    [InlineData("missing")]
    [InlineData("inactive")]
    [InlineData("expired")]
    [InlineData("exhausted")]
    [InlineData("wrong-role")]
    [InlineData("inactive-building")]
    public async Task Registro_solo_valida_y_rechaza_invitaciones_no_disponibles(string scenario)
    {
        await using var db = CrearDb($"invite-invalid-{scenario}");
        await PrepararInvitacion(db, scenario == "wrong-role" ? "Inquilino" : "Administrador", scenario);
        var controller = CreateController(db);

        var result = await controller.Registro(new RegistroRequest
        {
            CodigoInvitacion = scenario == "missing" ? "NO-EXISTE" : "INV-ADMIN",
            RolEsperado = "Administrador",
            SoloValidar = true,
        });

        Assert.IsType<BadRequestObjectResult>(result);
        var expectedUses = scenario == "exhausted" ? 1 : 0;
        Assert.All(await db.CodigosInvitacion.ToListAsync(), invitation => Assert.Equal(expectedUses, invitation.UsosRealizados));
    }

    private static AppDbContext CrearDb(string name)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"auth-{name}-{Guid.NewGuid():N}")
            .Options;
        return new AppDbContext(options);
    }

    private static async Task PrepararInvitacion(AppDbContext db, string roleName, string scenario = "valid")
    {
        db.RolesAplicacion.AddRange(
            new Rol { IdRol = 1, Nombre = "Administrador" },
            new Rol { IdRol = 2, Nombre = "Inquilino" });
        db.Edificios.Add(new Edificio
        {
            IdEdificio = 7,
            Nombre = "Torre",
            Direccion = "Calle 1",
            Localidad = "Rosario",
            Provincia = "Santa Fe",
            Estado = scenario == "inactive-building" ? "Inactivo" : "Activo",
        });

        if (scenario != "missing")
        {
            db.CodigosInvitacion.Add(new CodigoInvitacion
            {
                Codigo = "INV-ADMIN",
                IdEdificio = 7,
                IdRol = roleName == "Administrador" ? 1 : 2,
                FechaExpiracion = scenario == "expired" ? DateTime.UtcNow.AddMinutes(-1) : DateTime.UtcNow.AddDays(1),
                UsosMaximos = 1,
                UsosRealizados = scenario == "exhausted" ? 1 : 0,
                Activo = scenario != "inactive",
            });
        }

        await db.SaveChangesAsync();
    }

    private static AuthController CreateController(AppDbContext db)
    {
        return new AuthController(null!, null!, db, CrearTokenService(), null!, null!);
    }

    private static TokenService CrearTokenService()
    {
        return new TokenService(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:Secret"] = "ClaveDePruebaLargaYSeguraParaVecinApp2026!",
                ["JwtSettings:Issuer"] = "test",
                ["JwtSettings:Audience"] = "test",
            })
            .Build());
    }
}
