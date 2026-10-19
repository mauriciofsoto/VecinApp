using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VecinApp.Data;
using VecinApp.Models;
using VecinApp.Services;

var builder = WebApplication.CreateBuilder(args);


// Conexión con PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));


// Configuración de Identity
builder.Services.AddIdentity<Usuario, IdentityRole>(options =>
{
    options.Password.RequiredLength = 8;
    options.Password.RequireDigit = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireNonAlphanumeric = false;

    options.User.RequireUniqueEmail = true;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
})


.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// Configuración de JWT
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "ClaveSuperSecretaYExtensaParaFirmarTokensVecinApp2026!";
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "VecinAppBackend";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "VecinAppFrontend";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ClockSkew = TimeSpan.Zero
    };
});

// Servicios y CORS 
builder.Services.AddScoped<TokenService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// Pipeline HTTP
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("AllowAngular");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();




using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var userManager = services.GetRequiredService<UserManager<Usuario>>();
    var context = services.GetRequiredService<AppDbContext>();

    // 1. Obtener o crear un edificio para pruebas.
    var edificio = await context.Edificios.FirstOrDefaultAsync();

    if (edificio == null)
    {
        edificio = new Edificio
        {
            Nombre = "Edificio de prueba",
            Direccion = "Av. Corrientes 1234",
            Estado = "Activo"
        };

        context.Edificios.Add(edificio);
        await context.SaveChangesAsync();
    }

    // 2. Obtener los roles de la aplicación.
    var rolAdministrador = await context.RolesAplicacion
        .FirstOrDefaultAsync(r => r.Nombre == "Administrador");

    var rolInquilino = await context.RolesAplicacion
        .FirstOrDefaultAsync(r => r.Nombre == "Inquilino");

    if (rolAdministrador == null || rolInquilino == null)
    {
        throw new InvalidOperationException(
            "Falta el rol Administrador o Inquilino en la tabla rol.");
    }

    // 3. Crear o actualizar el usuario Administrador.
    const string emailAdmin = "vecino@vecinapp.com";
    const string passwordAdmin = "Password123";

    var admin = await userManager.FindByEmailAsync(emailAdmin);

    if (admin == null)
    {
        admin = new Usuario
        {
            UserName = emailAdmin,
            Email = emailAdmin,
            EmailConfirmed = true,
            Nombre = "Juan",
            Apellido = "Gonzalez",
            Estado = EstadoUsuario.Activo,
            FechaRegistro = DateTime.UtcNow,
            IdRol = rolAdministrador.IdRol,
            IdEdificio = edificio.IdEdificio
        };

        var resultado = await userManager.CreateAsync(admin, passwordAdmin);

        if (!resultado.Succeeded)
        {
            var errores = string.Join(
                ", ", resultado.Errors.Select(e => e.Description));

            throw new InvalidOperationException(
                $"No se pudo crear el administrador: {errores}");
        }
    }
    else
    {
        admin.IdRol = rolAdministrador.IdRol;
        admin.IdEdificio = edificio.IdEdificio;
        admin.Estado = EstadoUsuario.Activo;

        var resultado = await userManager.UpdateAsync(admin);

        if (!resultado.Succeeded)
        {
            var errores = string.Join(
                ", ", resultado.Errors.Select(e => e.Description));

            throw new InvalidOperationException(
                $"No se pudo actualizar el administrador: {errores}");
        }
    }

    // 4. Crear o actualizar el usuario Inquilino.
    const string emailInquilino = "inquilino@vecinapp.com";
    const string passwordInquilino = "Inquilino123";

    var inquilino = await userManager.FindByEmailAsync(emailInquilino);

    if (inquilino == null)
    {
        inquilino = new Usuario
        {
            UserName = emailInquilino,
            Email = emailInquilino,
            EmailConfirmed = true,
            Nombre = "Maria",
            Apellido = "Perez",
            Estado = EstadoUsuario.Activo,
            FechaRegistro = DateTime.UtcNow,
            IdRol = rolInquilino.IdRol,
            IdEdificio = edificio.IdEdificio
        };

        var resultado = await userManager.CreateAsync(
            inquilino, passwordInquilino);

        if (!resultado.Succeeded)
        {
            var errores = string.Join(
                ", ", resultado.Errors.Select(e => e.Description));

            throw new InvalidOperationException(
                $"No se pudo crear el inquilino: {errores}");
        }
    }
    else
    {
        inquilino.IdRol = rolInquilino.IdRol;
        inquilino.IdEdificio = edificio.IdEdificio;
        inquilino.Estado = EstadoUsuario.Activo;

        var resultado = await userManager.UpdateAsync(inquilino);

        if (!resultado.Succeeded)
        {
            var errores = string.Join(
                ", ", resultado.Errors.Select(e => e.Description));

            throw new InvalidOperationException(
                $"No se pudo actualizar el inquilino: {errores}");
        }
    }
}


app.Run();

