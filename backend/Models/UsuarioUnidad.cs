namespace VecinApp.Models;

public class UsuarioUnidad
{
    public int IdUsuarioUnidad { get; set; }

    public int IdUsuario { get; set; }

    public int IdUnidad { get; set; }

    public string TipoRelacion { get; set; } = string.Empty;

    // Relaciones
    public Usuario Usuario { get; set; } = null!;

    public Unidad Unidad { get; set; } = null!;
}