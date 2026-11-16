namespace VecinApp.DTOs;

public sealed record PerfilUsuarioDto(
    string Nombre,
    string Apellido,
    string Email,
    string? Telefono,
    string Rol,
    string? EdificioNombre,
    IReadOnlyList<UnidadVinculadaPerfilDto> UnidadesVinculadas,
    IReadOnlyList<UnidadDeclaradaPerfilDto> UnidadesDeclaradas,
    bool? ViveEnEdificio,
    bool? TieneOtrasUnidades,
    bool? DeclaraUnidadesAlquiladas,
    string? ModalidadAlquiler,
    string? FuncionPersonal,
    string? FuncionPersonalOtra,
    string? HorarioPersonal);

public sealed record UnidadVinculadaPerfilDto(
    int Id,
    string Piso,
    string Identificacion,
    string EdificioNombre,
    string TipoRelacion);

public sealed record UnidadDeclaradaPerfilDto(
    int Id,
    string Tipo,
    string? PisoDeclarado,
    string? IdentificacionDeclarada,
    bool EsPrincipalDeclarada,
    bool? EstaAlquiladaDeclarada,
    string EstadoConfirmacion,
    DateTime FechaDeclaracion,
    string? PersonaRelacionNombre,
    string? PersonaRelacionApellido,
    string? PisoRelacion,
    string? IdentificacionRelacion);
