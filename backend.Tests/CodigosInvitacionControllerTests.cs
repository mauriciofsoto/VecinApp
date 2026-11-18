using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using VecinApp.Controllers;
using VecinApp.Data;
using VecinApp.Models;
using VecinApp.Services;
using Xunit;

namespace VecinApp.Tests;

public sealed class CodigosInvitacionControllerTests
{
    [Fact]
    public async Task CrearCodigoAdministrador_asocia_el_edificio_y_el_rol_fijados_por_backend()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"admin-invite-{Guid.NewGuid():N}")
            .Options;
        await using var db = new AppDbContext(options);
        db.RolesAplicacion.AddRange(
            new Rol { IdRol = 1, Nombre = "Administrador" },
            new Rol { IdRol = 2, Nombre = "SuperAdministrador" });
        db.Edificios.Add(new Edificio
        {
            IdEdificio = 7,
            Nombre = "Torre Centro",
            Direccion = "Calle 10",
            Localidad = "Rosario",
            Provincia = "Santa Fe",
            Estado = "Activo",
        });
        db.Users.Add(new Usuario
        {
            Id = "super-1",
            UserName = "super-1",
            NormalizedUserName = "SUPER-1",
            Email = "super@example.test",
            NormalizedEmail = "SUPER@EXAMPLE.TEST",
            IdRol = 2,
            Estado = EstadoUsuario.Activo,
        });
        await db.SaveChangesAsync();

        var controller = CrearController(db, "super-1");
        var result = await controller.CrearCodigoAdministrador(new CrearCodigoInvitacionRequest
        {
            IdEdificio = 7,
            DiasValidez = 5,
        });

        Assert.IsType<OkObjectResult>(result);
        var invitacion = await db.CodigosInvitacion.SingleAsync();
        Assert.Equal(7, invitacion.IdEdificio);
        Assert.Equal(1, invitacion.IdRol);
        Assert.Equal(1, invitacion.UsosMaximos);
        Assert.Equal(0, invitacion.UsosRealizados);
        Assert.True(invitacion.Activo);
        Assert.InRange(invitacion.FechaExpiracion, DateTime.UtcNow.AddDays(4.9), DateTime.UtcNow.AddDays(5.1));
    }

    [Fact]
    public async Task CrearCodigoAdministrador_rechaza_a_un_Administrador_comun()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"admin-invite-forbidden-{Guid.NewGuid():N}")
            .Options;
        await using var db = new AppDbContext(options);
        db.RolesAplicacion.AddRange(
            new Rol { IdRol = 1, Nombre = "Administrador" },
            new Rol { IdRol = 2, Nombre = "SuperAdministrador" });
        db.Users.Add(new Usuario
        {
            Id = "admin-1",
            UserName = "admin-1",
            NormalizedUserName = "ADMIN-1",
            Email = "admin@example.test",
            NormalizedEmail = "ADMIN@EXAMPLE.TEST",
            IdRol = 1,
            Estado = EstadoUsuario.Activo,
        });
        await db.SaveChangesAsync();

        var controller = CrearController(db, "admin-1");
        var result = await controller.CrearCodigoAdministrador(new CrearCodigoInvitacionRequest
        {
            IdEdificio = 7,
        });

        Assert.IsType<ForbidResult>(result);
        Assert.Empty(await db.CodigosInvitacion.ToListAsync());
    }

    private static CodigosInvitacionController CrearController(AppDbContext db, string userId)
    {
        var store = new UserStore<Usuario>(db);
        var users = new UserManager<Usuario>(
            store,
            Options.Create(new IdentityOptions()),
            new PasswordHasher<Usuario>(),
            Array.Empty<IUserValidator<Usuario>>(),
            Array.Empty<IPasswordValidator<Usuario>>(),
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            null!,
            NullLogger<UserManager<Usuario>>.Instance);
        var controller = new CodigosInvitacionController(db, users, null!);
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
}
