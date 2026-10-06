namespace VecinApp.Models;

public class CategoriaPublicacion
{
    public int IdCategoriaPublicacion { get; set; }

    public string Nombre { get; set; } = string.Empty;

    // Relación
    public ICollection<Publicacion> Publicaciones { get; set; } = new List<Publicacion>();
}