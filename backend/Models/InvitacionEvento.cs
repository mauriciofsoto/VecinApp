namespace VecinApp.Models;

public class InvitacionEvento
{
    public int IdInvitacionEvento { get; set; }

    public int IdReserva { get; set; }

    public string IdUsuario { get; set; } = string.Empty;

    public string EstadoRespuesta { get; set; } = "pendiente"; // pendiente, asistira, no_asistira

    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;

    // Relaciones
    public Reserva Reserva { get; set; } = null!;

    public Usuario Usuario { get; set; } = null!;
}
