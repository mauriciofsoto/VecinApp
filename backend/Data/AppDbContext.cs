using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using VecinApp.Models;

namespace VecinApp.Data;

public class AppDbContext : IdentityDbContext<Usuario>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder); 
        
        builder.Entity<Usuario>(b =>
        {
            b.ToTable("Usuarios");

            b.Property(u => u.Nombre)
                .HasMaxLength(100)
                .IsRequired();

            b.Property(u => u.Apellido)
                .HasMaxLength(100)
                .IsRequired();

            b.Property(u => u.Estado)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            b.Property(u => u.FechaRegistro)
                .IsRequired();
        });
    }

    }
