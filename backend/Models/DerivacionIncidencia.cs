namespace VecinApp.Models;

public class DerivacionIncidencia
{
    public int IdDerivacionIncidencia { get; set; }
    public int IdIncidencia { get; set; }
    public string IdUsuarioAdministrador { get; set; } = string.Empty;
    public string IdUsuarioDestinatario { get; set; } = string.Empty;
    public string TipoDestinatario { get; set; } = string.Empty;
    public int? IdUnidad { get; set; }
    public DateTime FechaDerivacion { get; set; }

    public Incidencia Incidencia { get; set; } = null!;
    public Usuario UsuarioAdministrador { get; set; } = null!;
    public Usuario UsuarioDestinatario { get; set; } = null!;
    public Unidad? Unidad { get; set; }
}
