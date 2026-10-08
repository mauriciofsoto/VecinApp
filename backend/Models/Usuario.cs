using Microsoft.AspNetCore.Identity;

namespace VecinApp.Models;

public enum EstadoUsuario
{
    Activo = 1,
    Desactivado = 2
}

public class Usuario : IdentityUser
{
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public EstadoUsuario Estado { get; set; } = EstadoUsuario.Activo;
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;

    // Relaciones de tu compañera
    public int IdRol { get; set; }
    public Rol Rol { get; set; } = null!;

    public int? IdEdificio { get; set; }
    public Edificio? Edificio { get; set; }

    public ICollection<UsuarioUnidad> UsuariosUnidades { get; set; } = new List<UsuarioUnidad>();
}