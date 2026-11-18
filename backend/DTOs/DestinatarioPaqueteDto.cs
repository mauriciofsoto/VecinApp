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

public sealed record UnidadDestinatarioPaqueteDto(
    int Id,
    string Piso,
    string Identificacion,
    IReadOnlyList<ResidenteUnidadPaqueteDto> Residentes);

public sealed record ResidenteUnidadPaqueteDto(
    string Id,
    string Nombre,
    string Apellido,
    string Rol);
