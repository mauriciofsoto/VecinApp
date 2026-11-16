namespace VecinApp.Models;

public sealed class SolicitudVinculacion
{
    public int IdSolicitudVinculacion { get; set; }
    public string IdPropietario { get; set; } = string.Empty;
    public string IdInquilino { get; set; } = string.Empty;
    public int IdUnidad { get; set; }
    public int? IdDeclaracionPropietario { get; set; }
    public int? IdDeclaracionInquilino { get; set; }
    public string Estado { get; set; } = "Pendiente";
    public bool PropietarioAcepto { get; set; }
    public bool InquilinoAcepto { get; set; }
    public string? IdUsuarioRechazo { get; set; }
    public string? MotivoRechazo { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime? FechaRespuestaPropietario { get; set; }
    public DateTime? FechaRespuestaInquilino { get; set; }
    public DateTime? FechaRechazo { get; set; }
    public DateTime? FechaConfirmacion { get; set; }
    public int Version { get; set; }
    public Usuario Propietario { get; set; } = null!;
    public Usuario Inquilino { get; set; } = null!;
    public Usuario? UsuarioRechazo { get; set; }
    public Unidad Unidad { get; set; } = null!;
    public DeclaracionUnidadComunitaria? DeclaracionPropietario { get; set; }
    public DeclaracionUnidadComunitaria? DeclaracionInquilino { get; set; }
}
