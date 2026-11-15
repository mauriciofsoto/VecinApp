namespace VecinApp.DTOs;

public sealed record UnidadDeclaradaPaqueteDto(
    string? PisoDeclarado,
    string? IdentificacionDeclarada,
    string EstadoConfirmacion);

public sealed record DestinatarioPaqueteDto(
    string Id,
    string Nombre,
    string Apellido,
    IReadOnlyList<UnidadDeclaradaPaqueteDto> UnidadesDeclaradas);
