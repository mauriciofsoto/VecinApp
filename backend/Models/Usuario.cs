namespace VecinApp.Models;

public class Usuario
{
    public int IdUsuario { get; set; }

    public int IdRol { get; set; }

    public int? IdEdificio { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string Apellido { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Estado { get; set; } = string.Empty;

    // Relaciones
    public Rol Rol { get; set; } = null!;

    public Edificio? Edificio { get; set; }

    public ICollection<UsuarioUnidad> UsuariosUnidades { get; set; } = new List<UsuarioUnidad>();
}