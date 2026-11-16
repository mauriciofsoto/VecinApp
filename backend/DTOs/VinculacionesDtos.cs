using System.ComponentModel.DataAnnotations;

namespace VecinApp.DTOs;

public sealed class DeclaracionVinculacionRequest
{
    public int? IdDeclaracion { get; init; }
    [Required, StringLength(20)] public string Tipo { get; init; } = string.Empty;
    [Required, StringLength(100)] public string Piso { get; init; } = string.Empty;
    [Required, StringLength(100)] public string Identificacion { get; init; } = string.Empty;
    public bool EsPrincipal { get; init; }
    public bool? EstaAlquilada { get; init; }
    [StringLength(100)] public string? PersonaRelacionNombre { get; init; }
    [StringLength(100)] public string? PersonaRelacionApellido { get; init; }
    [StringLength(100)] public string? PisoRelacion { get; init; }
    [StringLength(100)] public string? IdentificacionRelacion { get; init; }
}

public sealed class ResponderVinculacionRequest
{
    [Required] public bool? Acepta { get; init; }
    [StringLength(500)] public string? Motivo { get; init; }
}

public sealed record SolicitudVinculacionDto(
    int Id,
    string Estado,
    bool MiParteAcepto,
    bool OtraParteAcepto,
    string NombreOtraParte,
    string RolOtraParte,
    string PisoUnidad,
    string IdentificacionUnidad,
    string? PisoResidenciaOtraParte,
    string? IdentificacionResidenciaOtraParte,
    DateTime FechaCreacion,
    DateTime? FechaRespuestaPropietario,
    DateTime? FechaRespuestaInquilino);
