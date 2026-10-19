namespace VecinApp.Models;

public class Comentario
{
    public int IdComentario { get; set; }

    public int IdPublicacion { get; set; }

    public string IdUsuario { get; set; } = string.Empty;

    public string Contenido { get; set; } = string.Empty;

    public DateTime Fecha { get; set; }

    // Relaciones
    public Publicacion Publicacion { get; set; } = null!;

    public Usuario Usuario { get; set; } = null!;
}