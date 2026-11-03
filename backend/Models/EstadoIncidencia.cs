namespace VecinApp.Models;

public class EstadoIncidencia
{
    public int IdEstadoIncidencia { get; set; }

    public string Nombre { get; set; } = string.Empty;

    // Relación
    public ICollection<Incidencia> Incidencias { get; set; } = new List<Incidencia>();
}