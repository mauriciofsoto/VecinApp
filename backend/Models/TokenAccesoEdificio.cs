namespace VecinApp.Models;

public class TokenAccesoEdificio
{
    public int Id { get; set; }

    public int IdEdificio { get; set; }

    public string HashToken { get; set; } = string.Empty;

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public DateTime FechaExpiracion { get; set; }

    public Edificio Edificio { get; set; } = null!;
}
