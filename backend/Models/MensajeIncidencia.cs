namespace VecinApp.Models;

public class MensajeIncidencia
{
    public int IdMensajeIncidencia { get; set; }

    public int IdIncidencia { get; set; }

    public string IdUsuarioEmisor { get; set; } = string.Empty;

    public string Contenido { get; set; } = string.Empty;

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public Incidencia Incidencia { get; set; } = null!;

    public Usuario UsuarioEmisor { get; set; } = null!;
}
