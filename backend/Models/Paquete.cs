
namespace VecinApp.Models;

public class Paquete
{
    public int IdPaquete { get; set; }

    public int IdUnidad { get; set; }

    public string IdUsuarioRegistro { get; set; } = string.Empty;

    public string Identificacion { get; set; } = string.Empty;

    public DateTime FechaRecepcion { get; set; }

    public string? Observaciones { get; set; }

    public string Estado { get; set; } = string.Empty;

    // Relaciones
    public Unidad Unidad { get; set; } = null!;

    public Usuario UsuarioRegistro { get; set; } = null!;
}
