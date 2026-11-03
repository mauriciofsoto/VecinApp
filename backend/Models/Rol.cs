namespace VecinApp.Models;

public class Rol
{
    public int IdRol { get; set; }

    public string Nombre { get; set; } = string.Empty;

    // Relación
    public ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
}