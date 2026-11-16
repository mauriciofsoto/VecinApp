namespace VecinApp.Models;

public class ReaccionPublicacion
{
    public int IdReaccion { get; set; }
    public int IdPublicacion { get; set; }
    public string IdUsuario { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public Publicacion Publicacion { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
}
