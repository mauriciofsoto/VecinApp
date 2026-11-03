
namespace VecinApp.Models;

public class CodigoInvitacion
{
    public int IdCodigoInvitacion { get; set; }

    public string Codigo { get; set; } = string.Empty;

    public int IdEdificio { get; set; }

    public int IdRol { get; set; }

    public DateTime FechaExpiracion { get; set; }

    public int UsosMaximos { get; set; } = 1;

    public int UsosRealizados { get; set; } = 0;

    public bool Activo { get; set; } = true;

    public Edificio? Edificio { get; set; }

    public Rol? Rol { get; set; }
}
