namespace VecinApp.Models;

public class Encuesta
{
	public int IdEncuesta { get; set; }

	public int IdPublicacion { get; set; }

	public DateTime FechaInicio { get; set; }

	public DateTime FechaFin { get; set; }

	public string Estado { get; set; } = string.Empty;

	// Relaciones
	public Publicacion Publicacion { get; set; } = null!;

	public ICollection<OpcionEncuesta> Opciones { get; set; } = new List<OpcionEncuesta>();

	public ICollection<RespuestaEncuesta> Respuestas { get; set; } = new List<RespuestaEncuesta>();
}