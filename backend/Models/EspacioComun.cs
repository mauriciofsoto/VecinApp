namespace VecinApp.Models;

public class EspacioComun
{
    public int IdEspacioComun { get; set; }

    public int IdEdificio { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string Descripcion { get; set; } = string.Empty;

    public TimeSpan HoraApertura { get; set; }

    public TimeSpan HoraCierre { get; set; }

    public int CapacidadMaxima { get; set; }

    public bool Activo { get; set; } = true;

    // Relaciones
    public Edificio Edificio { get; set; } = null!;

    public ICollection<Reserva> Reservas { get; set; } = new List<Reserva>();
}
