namespace VecinApp.Models;

public class Unidad
{
    public int IdUnidad { get; set; }

    public int IdEdificio { get; set; }

    public string Piso { get; set; } = string.Empty;

    public string Identificacion { get; set; } = string.Empty;

    // Relaciones
    public Edificio Edificio { get; set; } = null!;

    public ICollection<UsuarioUnidad> UsuariosUnidades { get; set; } = new List<UsuarioUnidad>();

    public ICollection<Paquete> Paquetes { get; set; } = new List<Paquete>();
}