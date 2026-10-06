namespace VecinApp.Models;

public class OpcionEncuesta
{
    public int IdOpcion { get; set; }

    public int IdEncuesta { get; set; }

    public string Texto { get; set; } = string.Empty;

    // Relaciones
    public Encuesta Encuesta { get; set; } = null!;

    public ICollection<RespuestaEncuesta> Respuestas { get; set; } = new List<RespuestaEncuesta>();
}