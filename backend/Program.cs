using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VecinApp.Data;
using VecinApp.Services;
using VecinApp.Models;

var builder = WebApplication.CreateBuilder(args);

// Conexion con DB
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));


builder.Services.AddIdentity<Usuario, IdentityRole>(options =>
{
    // Constraseñas
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

// JWT 
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

// Servicio para generar tokens y CORS para conectar con Angular (localhost:4200)
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


if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Habilitar CORS
app.UseCors("AllowAngular");

// Middleware de Autenticación y Autorización en orden estricto
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Seed inicial de usuario de prueba 
using (var scope = app.Services.CreateScope())
{
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<Usuario>>();
    var testEmail = "vecino@vecinapp.com";

    if (await userManager.FindByEmailAsync(testEmail) == null)
    {
        var testUser = new Usuario
        {
            UserName = testEmail,
            Email = testEmail,
            EmailConfirmed = true,
            Nombre = "Juan",
            Apellido = "Gonzalez",
            Estado = EstadoUsuario.Activo,
            FechaRegistro = DateTime.UtcNow
        };

        await userManager.CreateAsync(testUser, "Password123");
    }
}

app.Run();