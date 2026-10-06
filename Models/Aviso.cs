namespace VecinApp.Models;

public class Aviso
{
    public int IdAviso { get; set; }

    public int IdUsuario { get; set; }

    public int IdEdificio { get; set; }

    public string Titulo { get; set; } = string.Empty;

    public string Descripcion { get; set; } = string.Empty;

    public string Prioridad { get; set; } = string.Empty;

    public DateTime FechaPublicacion { get; set; }

    public DateTime? FechaVencimiento { get; set; }

    // Relaciones
    public Usuario Usuario { get; set; } = null!;

    public Edificio Edificio { get; set; } = null!;
}