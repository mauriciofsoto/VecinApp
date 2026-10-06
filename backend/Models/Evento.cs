namespace VecinApp.Models;

public class Evento
{
    public int IdEvento { get; set; }

    public int IdUsuario { get; set; }

    public int IdEdificio { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string Descripcion { get; set; } = string.Empty;

    public DateTime Fecha { get; set; }

    public TimeSpan Hora { get; set; }

    public string Ubicacion { get; set; } = string.Empty;

    public int CantidadParticipantes { get; set; }

    // Relaciones
    public Usuario Usuario { get; set; } = null!;

    public Edificio Edificio { get; set; } = null!;
}