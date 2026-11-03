namespace VecinApp.Models;

public class CategoriaIncidencia
{
    public int IdCategoriaIncidencia { get; set; }

    public string Nombre { get; set; } = string.Empty;

    // Relación
    public ICollection<Incidencia> Incidencias { get; set; } = new List<Incidencia>();
}