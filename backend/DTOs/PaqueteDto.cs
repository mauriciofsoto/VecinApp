namespace VecinApp.DTOs;

public sealed record PaqueteDto(
    int Id,
    string Identificacion,
    string Remitente,
    string IdUsuarioDestinatario,
    string NombreDestinatario,
    string ApellidoDestinatario,
    string Estado,
    DateTime FechaRecepcion,
    DateTime? FechaEntrega,
    DateTime? FechaConfirmacion,
    string? Observaciones);
