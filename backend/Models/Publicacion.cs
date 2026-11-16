namespace VecinApp.Models;

public class Publicacion
{
    public int IdPublicacion { get; set; }

    public string IdUsuario { get; set; } = string.Empty;

    public int IdEdificio { get; set; }

    public int IdCategoriaPublicacion { get; set; }

    public string Titulo { get; set; } = string.Empty;

    public string Contenido { get; set; } = string.Empty;

    public DateTime FechaPublicacion { get; set; }
    public DateTime? FechaLimite { get; set; }
    public string Estado { get; set; } = string.Empty;

    public bool Prioritaria { get; set; } = false;

    public bool ComentariosActivos { get; set; } = true;
    public ICollection<ReaccionPublicacion> Reacciones { get; set; } = new List<ReaccionPublicacion>();
    // Relaciones
    public Usuario Usuario { get; set; } = null!;

    public Edificio Edificio { get; set; } = null!;

    public CategoriaPublicacion CategoriaPublicacion { get; set; } = null!;

    public ICollection<Comentario> Comentarios { get; set; } = new List<Comentario>();

    public Encuesta? Encuesta { get; set; }
}