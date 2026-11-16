namespace VecinApp.Models;

public class MensajeReserva
{
    public int IdMensajeReserva { get; set; }

    public int IdReserva { get; set; }

    public string IdUsuarioEmisor { get; set; } = string.Empty;

    public string Contenido { get; set; } = string.Empty;

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    // Relaciones
    public Reserva Reserva { get; set; } = null!;

    public Usuario UsuarioEmisor { get; set; } = null!;
}
