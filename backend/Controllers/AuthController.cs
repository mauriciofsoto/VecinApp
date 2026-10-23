using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.DTOs;
using VecinApp.Models;
using VecinApp.Services;

namespace VecinApp.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<Usuario> _userManager;
    private readonly SignInManager<Usuario> _signInManager;
    private readonly AppDbContext _context;
    private readonly TokenService _tokenService;

    public AuthController(
        UserManager<Usuario> userManager,
        SignInManager<Usuario> signInManager,
        AppDbContext context,
        TokenService tokenService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _context = context;
        _tokenService = tokenService;
    }

    // POST /auth/registro
    [HttpPost("registro")]
    [AllowAnonymous]
    public async Task<IActionResult> Registro([FromBody] RegistroRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre) ||
            string.IsNullOrWhiteSpace(request.Apellido) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.CodigoInvitacion))
        {
            return BadRequest(new { message = "Todos los campos son obligatorios." });
        }

        var email = request.Email.Trim();
        var codigo = request.CodigoInvitacion.Trim().ToUpperInvariant();

        if (await _userManager.FindByEmailAsync(email) != null)
        {
            return BadRequest(new { message = "Ya existe una cuenta registrada con ese email." });
        }

        var invitacion = await _context.CodigosInvitacion
            .Include(c => c.Rol)
            .FirstOrDefaultAsync(c => c.Codigo == codigo);

        if (invitacion == null ||
            !invitacion.Activo ||
            invitacion.FechaExpiracion <= DateTime.UtcNow ||
            invitacion.UsosRealizados >= invitacion.UsosMaximos)
        {
            return BadRequest(new { message = "El código de invitación es inválido, está vencido o ya no tiene usos disponibles." });
        }

        var rolNombre = invitacion.Rol?.Nombre;

        if (rolNombre != "Inquilino" &&
    rolNombre != "Propietario" &&
    rolNombre != "Administrador")
        {
            return BadRequest(new { message = "El código no permite registrar este tipo de usuario." });
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            // Reservar un uso del código de forma atómica.
            var usosActualizados = await _context.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE codigo_invitacion SET usos_realizados = usos_realizados + 1 WHERE id_codigo_invitacion = {invitacion.IdCodigoInvitacion} AND activo = TRUE AND fecha_expiracion > {DateTime.UtcNow} AND usos_realizados < usos_maximos");

            if (usosActualizados != 1)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "El código de invitación ya no tiene usos disponibles." });
            }

            var usuario = new Usuario
            {
                UserName = email,
                Email = email,
                Nombre = request.Nombre.Trim(),
                Apellido = request.Apellido.Trim(),
                IdRol = invitacion.IdRol,
                IdEdificio = invitacion.IdEdificio,
                Estado = EstadoUsuario.Activo,
                FechaRegistro = DateTime.UtcNow
            };

            var resultado = await _userManager.CreateAsync(usuario, request.Password);

            if (!resultado.Succeeded)
            {
                await transaction.RollbackAsync();

                var errores = string.Join(
                    ", ",
                    resultado.Errors.Select(e => e.Description));

                return BadRequest(new
                {
                    message = $"No se pudo crear la cuenta: {errores}"
                });
            }

            await transaction.CommitAsync();

            return Ok(new
            {
                message = "Cuenta creada correctamente. Ya podés iniciar sesión."
            });
        }
        catch
        {
            await transaction.RollbackAsync();

            return StatusCode(500, new
            {
                message = "Ocurrió un error al registrar la cuenta."
            });
        }
    }


    // POST /auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email y contraseña requeridos" });
        }

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return Unauthorized(new { message = "Credenciales incorrectas" });
        }

        // Validación activo / desactivado
        if (user.Estado == EstadoUsuario.Desactivado)
        {
            return Unauthorized(new { message = "La cuenta se encuentra desactivada." });
        }

        // lockoutOnFailure: true aplica la política de bloqueo por intentos fallidos de Identity
        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            if (result.IsLockedOut)
            {
                return Unauthorized(new { message = "Cuenta bloqueada temporalmente por reiterados intentos fallidos." });
            }

            return Unauthorized(new { message = "Credenciales incorrectas" });
        }

        var rolNombre = user.IdRol.HasValue
    ? await _context.RolesAplicacion
        .Where(r => r.IdRol == user.IdRol.Value)
        .Select(r => r.Nombre)
        .FirstOrDefaultAsync()
    : null;

        var (accessToken, expiresAt) =
            _tokenService.GenerateAccessToken(user, rolNombre);
        var refreshToken = _tokenService.GenerateRefreshToken();

        _context.RefreshTokens.Add(new RefreshToken
        {
            Token = refreshToken,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });
        await _context.SaveChangesAsync();

        return Ok(new AuthResponse(accessToken, refreshToken, expiresAt));
    }

    // POST /auth/refresh
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest(new { message = "Refresh token requerido" });
        }

        var savedToken = await _context.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == request.RefreshToken && !r.IsRevoked);

        if (savedToken == null || savedToken.ExpiresAt < DateTime.UtcNow || savedToken.User == null)
        {
            return Unauthorized(new { message = "Refresh token inválido o expirado" });
        }

        // rotación de refresh tokens
        savedToken.IsRevoked = true;

        var rolNombre = savedToken.User.IdRol.HasValue
    ? await _context.RolesAplicacion
        .Where(r => r.IdRol == savedToken.User.IdRol.Value)
        .Select(r => r.Nombre)
        .FirstOrDefaultAsync()
    : null;

        var (newAccessToken, expiresAt) =
            _tokenService.GenerateAccessToken(savedToken.User, rolNombre);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        _context.RefreshTokens.Add(new RefreshToken
        {
            Token = newRefreshToken,
            UserId = savedToken.UserId,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });
        await _context.SaveChangesAsync();

        return Ok(new AuthResponse(newAccessToken, newRefreshToken, expiresAt));
    }

    // POST /auth/logout
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    {
        var token = await _context.RefreshTokens.FirstOrDefaultAsync(r => r.Token == request.RefreshToken);
        if (token != null)
        {
            token.IsRevoked = true;
            await _context.SaveChangesAsync();
        }
        return Ok(new { message = "Sesión cerrada correctamente" });
    }

    // GET /auth/me-test (Endpoint protegido de prueba)
    [HttpGet("me-test")]
    [Authorize]
    public IActionResult MeTest()
    {
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        return Ok(new
        {
            message = "Acceso autorizado al endpoint protegido",
            userId,
            email
        });
    }


    // POST /auth/forgot-password
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "El email es requerido." });
        }

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            
            return Ok(new { message = "Si el correo está registrado, recibirás las instrucciones para reestablecer tu contraseña." });
        }

        // Genera el código numérico de 6 dígitos asociado al email
        var codigoEmail = await _userManager.GenerateTwoFactorTokenAsync(user, "Email");

        return Ok(new
        {
            message = "Si el correo está registrado, recibirás las instrucciones para reestablecer tu contraseña.",
            devToken = codigoEmail
        });
    }
    // POST /auth/reset-password
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Token) ||
            string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { message = "Todos los campos son obligatorios." });
        }

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return BadRequest(new { message = "Solicitud inválida o expirada." });
        }

        // Validar código de 6 dígitos
        var esValido = await _userManager.VerifyTwoFactorTokenAsync(user, "Email", request.Token);
        if (!esValido)
        {
            return BadRequest(new { message = "El código de verificación es incorrecto o ha expirado." });
        }

        // Generar token interno y cambiar contraseña
        var tokenInterno = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, tokenInterno, request.NewPassword);
 
       


        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return BadRequest(new { message = $"No se pudo restablecer la contraseña: {errors}" });
        }

        return Ok(new { message = "Contraseña restablecida con éxito. Ya podés iniciar sesión." });
    }


}