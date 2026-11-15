namespace VecinApp.DTOs;

public sealed record CrearMensajePaqueteRequest(string Contenido);

public sealed record MensajePaqueteDto(
    int Id,
    string NombreEmisor,
    string ApellidoEmisor,
    string Contenido,
    DateTime FechaEnvio);
