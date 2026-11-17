using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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

    private static AuthController CreateController(AppDbContext db)
    {
        var tokenService = new TokenService(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:Secret"] = "ClaveDePruebaLargaYSeguraParaVecinApp2026!",
                ["JwtSettings:Issuer"] = "test",
                ["JwtSettings:Audience"] = "test",
            })
            .Build());
        return new AuthController(null!, null!, db, tokenService, null!, null!);
    }
}
