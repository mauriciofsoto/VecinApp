using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.Models;

namespace VecinApp.Services;

public sealed record TokenAccesoEmitido(string Token, DateTime FechaExpiracion);

public sealed class AccesoEdificioService
{
    public static readonly TimeSpan DuracionPredeterminada = TimeSpan.FromDays(3);

    private readonly AppDbContext _context;

    public AccesoEdificioService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<TokenAccesoEmitido?> EmitirAsync(Guid accesoPublicoId, CancellationToken cancellationToken = default)
    {
        var idEdificio = await _context.Edificios
            .AsNoTracking()
            .Where(edificio => edificio.AccesoPublicoId == accesoPublicoId)
            .Select(edificio => (int?)edificio.IdEdificio)
            .SingleOrDefaultAsync(cancellationToken);

        if (!idEdificio.HasValue)
            return null;

        var ahora = DateTime.UtcNow;
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        await _context.TokensAccesoEdificio
            .Where(token => token.IdEdificio == idEdificio.Value && token.FechaExpiracion <= ahora)
            .ExecuteDeleteAsync(cancellationToken);

        var tokenEnClaro = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(tokenEnClaro)));
        var vence = ahora.Add(DuracionPredeterminada);

        _context.TokensAccesoEdificio.Add(new TokenAccesoEdificio
        {
            IdEdificio = idEdificio.Value,
            HashToken = hash,
            FechaCreacion = ahora,
            FechaExpiracion = vence
        });
        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new TokenAccesoEmitido(tokenEnClaro, vence);
    }

    public async Task<int?> ValidarAsync(string tokenEnClaro, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tokenEnClaro) || tokenEnClaro.Length > 128)
            return null;

        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(tokenEnClaro)));
        var ahora = DateTime.UtcNow;

        return await _context.TokensAccesoEdificio
            .AsNoTracking()
            .Where(token => token.HashToken == hash && token.FechaExpiracion > ahora)
            .Select(token => (int?)token.IdEdificio)
            .SingleOrDefaultAsync(cancellationToken);
    }
}
