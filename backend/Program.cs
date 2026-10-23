using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VecinApp.Data;
using VecinApp.Models;
using VecinApp.Services;
using Microsoft.OpenApi;
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


builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Autenticación mediante token JWT."
    });

    options.AddSecurityRequirement(document =>
        new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference("Bearer", document)] = []
        });
});



var app = builder.Build();

// Pipeline HTTP
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
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

    var rolSuperAdministrador = await context.RolesAplicacion
        .FirstOrDefaultAsync(r => r.Nombre == "SuperAdministrador");

    if (rolSuperAdministrador == null)
    {
        rolSuperAdministrador = new Rol
        {
            Nombre = "SuperAdministrador"
        };

        context.RolesAplicacion.Add(rolSuperAdministrador);
        await context.SaveChangesAsync();
    }

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

    // 5. Crear o actualizar el SuperAdministrador inicial.
    const string emailSuperAdmin = "superadmin@vecinapp.com";
    const string passwordSuperAdmin = "SuperAdmin123";

    var superAdmin = await userManager.FindByEmailAsync(emailSuperAdmin);

    if (superAdmin == null)
    {
        superAdmin = new Usuario
        {
            UserName = emailSuperAdmin,
            Email = emailSuperAdmin,
            EmailConfirmed = true,
            Nombre = "Super",
            Apellido = "Administrador",
            Estado = EstadoUsuario.Activo,
            FechaRegistro = DateTime.UtcNow,
            IdRol = rolSuperAdministrador.IdRol,
            IdEdificio = null
        };

        var resultado = await userManager.CreateAsync(
            superAdmin, passwordSuperAdmin);

        if (!resultado.Succeeded)
        {
            var errores = string.Join(
                ", ", resultado.Errors.Select(e => e.Description));

            throw new InvalidOperationException(
                $"No se pudo crear el SuperAdministrador: {errores}");
        }
    }
    else
    {
        superAdmin.IdRol = rolSuperAdministrador.IdRol;
        superAdmin.IdEdificio = null;
        superAdmin.Estado = EstadoUsuario.Activo;
        superAdmin.EmailConfirmed = true;
        superAdmin.LockoutEnd = null;
        superAdmin.AccessFailedCount = 0;

        var resultado = await userManager.UpdateAsync(superAdmin);

        if (!resultado.Succeeded)
        {
            var errores = string.Join(
                ", ", resultado.Errors.Select(e => e.Description));

            throw new InvalidOperationException(
                $"No se pudo actualizar el SuperAdministrador: {errores}");
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(superAdmin);

        var resultadoPassword = await userManager.ResetPasswordAsync(
            superAdmin, token, passwordSuperAdmin);

        if (!resultadoPassword.Succeeded)
        {
            var errores = string.Join(
                ", ", resultadoPassword.Errors.Select(e => e.Description));

            throw new InvalidOperationException(
                $"No se pudo restablecer la contraseña del SuperAdministrador: {errores}");
        }
    }

}


app.Run();

