namespace VecinApp.DTOs;

public record LoginRequest(string Email, string Password);

public record AuthUserDto(
    string Id,
    string Nombre,
    string Apellido,
    string Email,
    string Rol
);

public record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, AuthUserDto User);

public record RefreshRequest(string RefreshToken);

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string Email, string Token, string NewPassword);

public record LogoutRequest(string RefreshToken);