namespace VecinApp.Models;

public class MensajePaquete
{
    public int IdMensajePaquete { get; set; }

    public int IdPaquete { get; set; }

    public string IdUsuarioEmisor { get; set; } = string.Empty;

    public string Contenido { get; set; } = string.Empty;

    public DateTime FechaEnvio { get; set; } = DateTime.UtcNow;

    // Relaciones
    public Paquete Paquete { get; set; } = null!;

    public Usuario UsuarioEmisor { get; set; } = null!;
}