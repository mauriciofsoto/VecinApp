namespace VecinApp.DTOs;

public sealed record EspacioComunDto(
    int Id,
    int EdificioId,
    string Nombre,
    string Descripcion,
    string HoraApertura,
    string HoraCierre,
    int CapacidadMaxima,
    bool Activo);

public sealed record ReservaDto(
    int Id,
    string UsuarioId,
    string UsuarioNombre,
    int? UnidadId,
    string? UnidadNombre,
    int EdificioId,
    int EspacioId,
    string Titulo,
    string Descripcion,
    string Fecha,
    string HoraInicio,
    string HoraFin,
    int CantidadParticipantes,
    string Estado,
    string? TipoEvento,
    string? CategoriaEvento,
    string FechaCreacion,
    bool CreadaPorAdministracion);

public sealed record CrearReservaRequest(
    int EspacioId,
    int? UnidadId,
    string Titulo,
    string Descripcion,
    string Fecha,
    string HoraInicio,
    string HoraFin,
    int CantidadParticipantes,
    string? TipoEvento,
    string? CategoriaEvento);

public sealed record EditarReservaRequest(
    int EspacioId,
    int? UnidadId,
    string Titulo,
    string Descripcion,
    string Fecha,
    string HoraInicio,
    string HoraFin,
    int CantidadParticipantes,
    string? TipoEvento,
    string? CategoriaEvento);

public sealed record CrearEventoAdminRequest(
    int EspacioId,
    string Titulo,
    string Descripcion,
    string Fecha,
    string HoraInicio,
    string HoraFin,
    int CantidadParticipantes,
    string? CategoriaEvento);

public sealed record RechazarReservaRequest(
    string? Motivo);

public sealed record MensajeReservaDto(
    int Id,
    int ReservaId,
    string EmisorId,
    string EmisorNombre,
    string RolEmisor,
    string Contenido,
    string FechaEnvio);

public sealed record CrearMensajeRequest(
    string Contenido);

public sealed record EventoPublicoDto(
    int Id,
    int ReservaId,
    string Titulo,
    string Descripcion,
    string Fecha,
    string HoraInicio,
    string HoraFin,
    string EspacioNombre,
    string OrganizadorNombre,
    string? CategoriaEvento,
    int AsistentesConfirmados,
    string? MiEstadoRespuesta);

public sealed record ResponderInvitacionRequest(
    string EstadoRespuesta);
