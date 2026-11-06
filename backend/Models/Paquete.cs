
namespace VecinApp.Models;

public class Paquete
{
    public int IdPaquete { get; set; }

    public int IdUnidad { get; set; }

    public string IdUsuarioRegistro { get; set; } = string.Empty;

    public string IdUsuarioDestinatario { get; set; } = string.Empty;

    public string Identificacion { get; set; } = string.Empty;

    public DateTime FechaRecepcion { get; set; }

    public string? Observaciones { get; set; }

    public string Estado { get; set; } = "Pendiente";

    public DateTime? FechaConfirmacion { get; set; }

    public DateTime? FechaEliminacion { get; set; }

    // Relaciones
    public Unidad Unidad { get; set; } = null!;

    public Usuario UsuarioRegistro { get; set; } = null!;

    public Usuario UsuarioDestinatario { get; set; } = null!;

    public ICollection<MensajePaquete> Mensajes { get; set; }
        = new List<MensajePaquete>();
}
