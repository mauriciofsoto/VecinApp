namespace VecinApp.Models;

public class Incidencia
{
    public int IdIncidencia { get; set; }

    public int IdEdificio { get; set; }

    public int IdUsuarioReportante { get; set; }

    public int? IdUsuarioResponsable { get; set; }

    public int IdEstadoIncidencia { get; set; }

    public int IdCategoriaIncidencia { get; set; }

    public string Titulo { get; set; } = string.Empty;

    public string Descripcion { get; set; } = string.Empty;

    public string Prioridad { get; set; } = string.Empty;

    public DateTime FechaCreacion { get; set; }

    // Relaciones
    public Edificio Edificio { get; set; } = null!;

    public Usuario UsuarioReportante { get; set; } = null!;

    public Usuario? UsuarioResponsable { get; set; }

    public EstadoIncidencia EstadoIncidencia { get; set; } = null!;

    public CategoriaIncidencia CategoriaIncidencia { get; set; } = null!;
}