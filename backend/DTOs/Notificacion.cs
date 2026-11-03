namespace VecinApp.DTOs;

public record NotificacionDto(
    int IdNotificacion,
    string Titulo,
    string Tipo,
    string Mensaje,
    DateTime Fecha,
    bool Leida,
    string? Ruta
);
