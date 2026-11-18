namespace VecinApp.DTOs;

public sealed record RegistrarPaqueteRequest(
    string IdUsuarioDestinatario,
    string Remitente,
    string Identificacion,
    string? Observaciones,
    int? IdUnidad = null);
