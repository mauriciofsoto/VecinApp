namespace VecinApp.Models;

public class RespuestaEncuesta
{
    public int IdRespuesta { get; set; }

    public int IdEncuesta { get; set; }

    public int IdOpcion { get; set; }

    public int IdUsuario { get; set; }

    public DateTime FechaRespuesta { get; set; }

    // Relaciones
    public Encuesta Encuesta { get; set; } = null!;

    public OpcionEncuesta Opcion { get; set; } = null!;

    public Usuario Usuario { get; set; } = null!;
}