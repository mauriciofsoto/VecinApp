namespace VecinApp.DTOs;

public sealed record UsuarioComunidadDto(
    string Id,
    string Nombre,
    string Apellido,
    string Email,
    string Rol,
    string Estado,
    DateTime FechaRegistro,
    string? PerfilComunitario,
    IReadOnlyList<UnidadDeclaradaDto> UnidadesDeclaradas);

public sealed record UnidadDeclaradaDto(
    int IdDeclaracionUnidad,
    string Tipo,
    string? PisoDeclarado,
    string? IdentificacionDeclarada,
    bool EsPrincipalDeclarada,
    bool? EstaAlquiladaDeclarada,
    string EstadoConfirmacion,
    DateTime FechaDeclaracion);