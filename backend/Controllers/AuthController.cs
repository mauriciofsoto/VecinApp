using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Text;
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
    private readonly AccesoEdificioService _accesoEdificioService;

    public AuthController(
        UserManager<Usuario> userManager,
        SignInManager<Usuario> signInManager,
        AppDbContext context,
        TokenService tokenService,
        AccesoEdificioService accesoEdificioService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _context = context;
        _tokenService = tokenService;
        _accesoEdificioService = accesoEdificioService;
    }

    // POST /auth/registro-administrador
    [HttpPost("registro-administrador")]
    [AllowAnonymous]
    public async Task<IActionResult> RegistroAdministrador(
        [FromBody] RegistroAdministradorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre) ||
            string.IsNullOrWhiteSpace(request.Apellido) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Telefono) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.NombreEdificio) ||
            string.IsNullOrWhiteSpace(request.Direccion) ||
            string.IsNullOrWhiteSpace(request.Localidad) ||
            string.IsNullOrWhiteSpace(request.Provincia))
        {
            return BadRequest(new { message = "Completá todos los campos obligatorios." });
        }

        var email = request.Email.Trim();
        if (!new EmailAddressAttribute().IsValid(email))
            return BadRequest(new { message = "Ingresá un correo electrónico válido." });

        if (await _userManager.FindByEmailAsync(email) != null)
            return BadRequest(new { message = "Ya existe una cuenta registrada con ese email." });

        var rolAdministrador = await _context.RolesAplicacion
            .SingleOrDefaultAsync(rol => rol.Nombre == "Administrador");

        if (rolAdministrador == null)
            return StatusCode(500, new { message = "El rol Administrador no está configurado." });

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var edificio = new Edificio
            {
                Nombre = request.NombreEdificio.Trim(),
                Direccion = request.Direccion.Trim(),
                Localidad = request.Localidad.Trim(),
                Provincia = request.Provincia.Trim(),
                Estado = "Activo"
            };

            _context.Edificios.Add(edificio);
            await _context.SaveChangesAsync();

            var usuario = new Usuario
            {
                UserName = email,
                Email = email,
                PhoneNumber = request.Telefono.Trim(),
                Nombre = request.Nombre.Trim(),
                Apellido = request.Apellido.Trim(),
                IdRol = rolAdministrador.IdRol,
                IdEdificio = edificio.IdEdificio,
                Estado = EstadoUsuario.Activo,
                FechaRegistro = DateTime.UtcNow
            };

            var resultado = await _userManager.CreateAsync(usuario, request.Password);
            if (!resultado.Succeeded)
            {
                await transaction.RollbackAsync();
                var errores = string.Join(", ", resultado.Errors.Select(error => error.Description));
                return BadRequest(new { message = $"No se pudo crear la cuenta: {errores}" });
            }

            await transaction.CommitAsync();
            return Ok(new { message = "Cuenta y edificio creados correctamente. Ya podés iniciar sesión." });
        }
        catch
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Ocurrió un error al crear la cuenta y el edificio." });
        }
    }

    // POST /auth/registro-comunidad
    [HttpPost("registro-comunidad")]
    [AllowAnonymous]
    public async Task<IActionResult> RegistroComunidad(
        [FromBody] RegistroAccesoComunidadRequest request)
    {
        var email = request.Email.Trim();
        var errorValidacion = ValidarRegistroComunidad(request);
        if (errorValidacion != null)
            return BadRequest(new { message = errorValidacion });

        if (await _userManager.FindByEmailAsync(email) != null)
            return BadRequest(new { message = "Ya existe una cuenta registrada con ese email." });

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var idEdificio = await _accesoEdificioService.ValidarAsync(
                request.TokenAcceso, HttpContext.RequestAborted);
            if (!idEdificio.HasValue)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "El acceso al edificio es inválido o venció. Volvé a abrir el QR." });
            }

            // Resolver todas las declaraciones antes de crear el usuario. Una coincidencia
            // normalizada ambigua rechaza el registro sin dejar datos parciales.
            var unidadesEdificio = await _context.Unidades
                .Where(unidad => unidad.IdEdificio == idEdificio.Value)
                .ToListAsync(HttpContext.RequestAborted);
            var unidadesResueltas = new List<Unidad?>();
            foreach (var declaracion in request.Unidades)
            {
                var piso = NormalizarDireccionUnidad(declaracion.Piso)!;
                var identificacion = NormalizarDireccionUnidad(declaracion.Identificacion)!;
                var coincidencias = unidadesEdificio
                    .Where(actual =>
                        NormalizarDireccionUnidad(actual.Piso) == piso &&
                        NormalizarDireccionUnidad(actual.Identificacion) == identificacion)
                    .ToList();

                if (coincidencias.Count > 1)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { message = "La unidad declarada coincide con más de una unidad del edificio. Contactá a la administración." });
                }

                unidadesResueltas.Add(coincidencias.SingleOrDefault());
            }

            var perfilDerivado = DerivarPerfilComunidad(request);
            var nombreRol = perfilDerivado switch
            {
                "Propietario" => "Propietario",
                "Inquilino" => "Inquilino",
                _ => null
            };
            if (perfilDerivado == "Personal")
                nombreRol = "Portero";
            if (nombreRol == null)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "El perfil seleccionado no está permitido." });
            }

            var idRol = await _context.RolesAplicacion
                .Where(rol => rol.Nombre == nombreRol)
                .Select(rol => (int?)rol.IdRol)
                .SingleOrDefaultAsync();
            if (!idRol.HasValue)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = $"El rol {nombreRol} no está configurado." });
            }

            var usuario = new Usuario
            {
                UserName = email,
                Email = email,
                Nombre = request.Nombre.Trim(),
                Apellido = request.Apellido.Trim(),
                IdRol = idRol.Value,
                IdEdificio = idEdificio.Value,
                Estado = EstadoUsuario.Activo,
                FechaRegistro = DateTime.UtcNow
            };

            var resultado = await _userManager.CreateAsync(usuario, request.Password);
            if (!resultado.Succeeded)
            {
                await transaction.RollbackAsync();
                var errores = string.Join(", ", resultado.Errors.Select(error => error.Description));
                return BadRequest(new { message = $"No se pudo crear la cuenta: {errores}" });
            }

            var registro = CrearRegistroComunitario(usuario.Id, request, perfilDerivado);
            _context.RegistrosComunitarios.Add(registro);

            for (var indice = 0; indice < request.Unidades.Count; indice++)
            {
                var declaracion = request.Unidades[indice];

                _context.DeclaracionesUnidadesComunitarias.Add(new DeclaracionUnidadComunitaria
                {
                    IdUsuario = usuario.Id,
                    IdEdificio = idEdificio.Value,
                    Unidad = unidadesResueltas[indice],
                    Tipo = declaracion.Tipo,
                    PisoDeclarado = declaracion.Piso?.Trim(),
                    IdentificacionDeclarada = declaracion.Identificacion?.Trim(),
                    EsPrincipal = declaracion.EsPrincipal,
                    EstaAlquilada = declaracion.Tipo == "Titularidad" ? declaracion.EstaAlquilada : null,
                    EstadoConfirmacion = "Declarada",
                    FechaDeclaracion = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync(HttpContext.RequestAborted);

            await transaction.CommitAsync();
            return Ok(new { message = "Cuenta y respuestas comunitarias guardadas correctamente. Ya podés iniciar sesión." });
        }
        catch
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Ocurrió un error al registrar la cuenta." });
        }
    }

    private static string? ValidarRegistroComunidad(RegistroAccesoComunidadRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre) || string.IsNullOrWhiteSpace(request.Apellido) ||
            string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.TokenAcceso))
            return "Completá los campos obligatorios y volvé a abrir el QR si el token no está disponible.";
        if (!new EmailAddressAttribute().IsValid(request.Email.Trim()))
            return "Ingresá un correo electrónico válido.";
        if (request.Unidades == null || request.Unidades.Count > 30)
            return "La lista de unidades no es válida.";

        var perfil = request.Perfil;
        if (perfil is not ("Propietario" or "Inquilino" or "Personal"))
            return "El perfil seleccionado no está permitido.";

        if (request.Unidades.Any(unidad => unidad == null || unidad.Tipo is not ("Titularidad" or "Residencia" or "Ocupacion")))
            return "Hay una relación de unidad no válida.";

        if (request.Unidades.Any(unidad => string.IsNullOrWhiteSpace(unidad.Piso) || string.IsNullOrWhiteSpace(unidad.Identificacion)))
            return "Completá el piso y la identificación de cada unidad declarada.";

        var unidadesDuplicadas = request.Unidades
            .GroupBy(unidad => $"{NormalizarDireccionUnidad(unidad.Piso)}|{NormalizarDireccionUnidad(unidad.Identificacion)}")
            .Any(grupo => grupo.Count() > 1);
        if (unidadesDuplicadas)
            return "No repitas una misma unidad en la declaración.";

        if (perfil == "Personal")
        {
            if (request.Unidades.Count > 0) return "El perfil de personal no puede declarar unidades.";
            var funciones = new[] { "Encargado/a", "Seguridad o portería", "Limpieza", "Mantenimiento", "Administración", "Otro" };
            if (request.FuncionPersonal == null || !funciones.Contains(request.FuncionPersonal))
                return "Seleccioná una función válida para el personal.";
            if (request.FuncionPersonal == "Otro" && string.IsNullOrWhiteSpace(request.FuncionPersonalOtra))
                return "Especificá la función seleccionada como otro.";
            return null;
        }

        var residencias = request.Unidades.Where(unidad => unidad.Tipo == "Residencia").ToList();
        var titularidades = request.Unidades.Where(unidad => unidad.Tipo == "Titularidad").ToList();
        var ocupaciones = request.Unidades.Where(unidad => unidad.Tipo == "Ocupacion").ToList();
        if (ocupaciones.Any(unidad => unidad.EsPrincipal) ||
            residencias.Any(unidad => unidad.EstaAlquilada == true) ||
            titularidades.Any(unidad => unidad.EsPrincipal && unidad.EstaAlquilada == true))
            return "La unidad principal, la residencia y las unidades alquiladas deben ser consistentes.";

        if (request.ModalidadAlquiler is "Directo" or "InmobiliariaAdministracion")
        {
            if (perfil != "Inquilino" || request.Unidades.Count != 1 || ocupaciones.Count != 1)
                return "El perfil de inquilino debe declarar una unidad de ocupación.";
            if (request.ModalidadAlquiler == "Directo" && request.PropietarioDeclaradoViveEnEdificio == null)
                return "Indicá si el propietario declarado vive en el edificio.";
            if (request.ViveEnEdificio == false || request.TieneOtrasUnidades == true || request.DeclaraUnidadesAlquiladas == true)
                return "La declaración de alquiler del inquilino contradice las respuestas sobre otras unidades.";
        }
        else if (request.ViveEnEdificio == true && request.TieneOtrasUnidades == false && request.DeclaraUnidadesAlquiladas == false)
        {
            if (perfil != "Inquilino" || request.Unidades.Count != 1 || residencias.Count != 1 ||
                !residencias[0].EsPrincipal || titularidades.Count != 0 || ocupaciones.Count != 0 ||
                request.ModalidadAlquiler != null)
                return "El residente sin otras unidades debe declarar únicamente su residencia como unidad principal.";
        }
        else if ((request.ViveEnEdificio == true || request.ViveEnEdificio == false) &&
                 request.TieneOtrasUnidades == true && request.DeclaraUnidadesAlquiladas == true)
        {
            if (perfil != "Propietario" || titularidades.Count == 0 || ocupaciones.Count != 0 ||
                titularidades.Any(unidad => unidad.EstaAlquilada != true || unidad.EsPrincipal))
                return "El propietario debe declarar todas las unidades alquiladas como titularidades no principales.";

            if (request.ViveEnEdificio == true)
            {
                if (residencias.Count != 1 || !residencias[0].EsPrincipal)
                    return "El propietario residente debe declarar su residencia como unidad principal.";
            }
            else if (residencias.Count > 0 || request.Unidades.Any(unidad => unidad.EsPrincipal))
                return "El propietario no residente no debe declarar residencia ni unidad principal.";

            if (request.ModalidadAlquiler != null)
                return "La modalidad de alquiler corresponde al registro de un inquilino.";
        }
        else
        {
            return "Las respuestas sobre residencia y unidades alquiladas son incompletas o contradictorias.";
        }

        var perfilDerivado = DerivarPerfilComunidad(request);
        if (perfil != perfilDerivado)
            return "El perfil seleccionado no coincide con las declaraciones realizadas.";

        return null;
    }

    private static string DerivarPerfilComunidad(RegistroAccesoComunidadRequest request)
    {
        if (request.Perfil == "Personal") return "Personal";
        return request.Unidades.Any(unidad => unidad.Tipo == "Titularidad" && unidad.EstaAlquilada == true)
            ? "Propietario"
            : "Inquilino";
    }

    private static RegistroComunitario CrearRegistroComunitario(string idUsuario, RegistroAccesoComunidadRequest request, string perfilDerivado)
    {
        var registro = new RegistroComunitario
        {
            IdUsuario = idUsuario,
            Perfil = perfilDerivado,
            OrigenDeclaracion = perfilDerivado == "Inquilino" && request.ModalidadAlquiler != null
                ? "DeclaracionInquilino"
                : "DeclaracionPropia",
            FechaRegistro = DateTime.UtcNow
        };

        if (perfilDerivado == "Propietario")
        {
            registro.ViveEnEdificio = request.ViveEnEdificio;
            registro.TieneOtrasUnidades = request.TieneOtrasUnidades;
            registro.DeclaraUnidadesAlquiladas = request.DeclaraUnidadesAlquiladas;
        }
        else if (perfilDerivado == "Inquilino" && request.ModalidadAlquiler != null)
        {
            registro.ModalidadAlquiler = request.ModalidadAlquiler;
            if (request.ModalidadAlquiler == "Directo" && request.PropietarioDeclaradoViveEnEdificio == true)
            {
                registro.PropietarioDeclaradoViveEnEdificio = true;
                registro.PropietarioDeclaradoNombre = request.PropietarioDeclaradoNombre?.Trim();
                registro.PropietarioDeclaradoApellido = request.PropietarioDeclaradoApellido?.Trim();
                registro.PropietarioDeclaradoPiso = request.PropietarioDeclaradoPiso?.Trim();
                registro.PropietarioDeclaradoUnidad = request.PropietarioDeclaradoUnidad?.Trim();
            }
            else if (request.ModalidadAlquiler == "Directo")
            {
                registro.PropietarioDeclaradoViveEnEdificio = false;
            }
        }
        else if (perfilDerivado == "Inquilino")
        {
            registro.ViveEnEdificio = request.ViveEnEdificio;
            registro.TieneOtrasUnidades = request.TieneOtrasUnidades;
            registro.DeclaraUnidadesAlquiladas = request.DeclaraUnidadesAlquiladas;
        }
        else if (perfilDerivado == "Personal")
        {
            registro.FuncionPersonal = request.FuncionPersonal;
            registro.FuncionPersonalOtra = request.FuncionPersonal == "Otro" ? request.FuncionPersonalOtra?.Trim() : null;
            registro.HorarioPersonal = request.HorarioPersonal?.Trim();
        }

        return registro;
    }

    private static string? NormalizarDireccionUnidad(string? valor)
    {
        var partes = valor?.Normalize(NormalizationForm.FormKC).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        var normalizado = partes == null ? null : string.Join(' ', partes).ToUpperInvariant();
        return string.IsNullOrWhiteSpace(normalizado) ? null : normalizado;
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

        var authUser = new AuthUserDto(user.Id,user.Nombre,user.Apellido,user.Email ?? string.Empty,rolNombre ?? string.Empty);
         return Ok(new AuthResponse(
            accessToken,
            refreshToken,
            expiresAt,
            authUser
        ));
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

        var authUser = new AuthUserDto(savedToken.User.Id,savedToken.User.Nombre,savedToken.User.Apellido,savedToken.User.Email ?? string.Empty,rolNombre ?? string.Empty);

        return Ok(new AuthResponse(
            newAccessToken,
            newRefreshToken,
            expiresAt,
            authUser
        ));

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
