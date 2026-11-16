namespace VecinApp.Models;

public class Reserva
{
    public int IdReserva { get; set; }

    public int IdEdificio { get; set; }

    public string IdUsuario { get; set; } = string.Empty;

    public int? IdUnidad { get; set; }

    public int IdEspacioComun { get; set; }

    public string Titulo { get; set; } = string.Empty;

    public string Descripcion { get; set; } = string.Empty;

    public DateOnly Fecha { get; set; }

    public TimeSpan HoraInicio { get; set; }

    public TimeSpan HoraFin { get; set; }

    public int CantidadParticipantes { get; set; }

    public string Estado { get; set; } = "pendiente"; // pendiente, confirmada, rechazada, cancelada

    public string? TipoEvento { get; set; } // privado, publico

    public string? CategoriaEvento { get; set; } // social, deportivo, cultural, reunion, otro

    public bool CreadaPorAdministracion { get; set; } = false;

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    // Relaciones
    public Edificio Edificio { get; set; } = null!;

    public Usuario Usuario { get; set; } = null!;

    public Unidad? Unidad { get; set; }

    public EspacioComun EspacioComun { get; set; } = null!;

    public ICollection<MensajeReserva> Mensajes { get; set; } = new List<MensajeReserva>();

    public ICollection<InvitacionEvento> Invitaciones { get; set; } = new List<InvitacionEvento>();
}
