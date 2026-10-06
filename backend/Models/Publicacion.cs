namespace VecinApp.Models;

public class Publicacion
{
    public int IdPublicacion { get; set; }

    public int IdUsuario { get; set; }

    public int IdEdificio { get; set; }

    public int IdCategoriaPublicacion { get; set; }

    public string Titulo { get; set; } = string.Empty;

    public string Contenido { get; set; } = string.Empty;

    public DateTime FechaPublicacion { get; set; }

    public string Estado { get; set; } = string.Empty;

    // Relaciones
    public Usuario Usuario { get; set; } = null!;

    public Edificio Edificio { get; set; } = null!;

    public CategoriaPublicacion CategoriaPublicacion { get; set; } = null!;

    public ICollection<Comentario> Comentarios { get; set; } = new List<Comentario>();

    public Encuesta? Encuesta { get; set; }
}