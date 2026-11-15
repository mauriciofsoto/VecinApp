namespace VecinApp.Models;

public class DeclaracionUnidadComunitaria
{
    public int IdDeclaracionUnidad { get; set; }
    public string IdUsuario { get; set; } = string.Empty;
    public int IdEdificio { get; set; }
    public int? IdUnidad { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string? PisoDeclarado { get; set; }
    public string? IdentificacionDeclarada { get; set; }
    public bool EsPrincipal { get; set; }
    public bool? EstaAlquilada { get; set; }
    public string EstadoConfirmacion { get; set; } = "Declarada";
    public DateTime FechaDeclaracion { get; set; } = DateTime.UtcNow;

    public Usuario Usuario { get; set; } = null!;
    public Edificio Edificio { get; set; } = null!;
    public Unidad? Unidad { get; set; }
}
