namespace VecinApp.Models;

public class Edificio
{
    public int IdEdificio { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string Direccion { get; set; } = string.Empty;

    public string Estado { get; set; } = string.Empty;

    // Relaciones
    public ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();

    public ICollection<Unidad> Unidades { get; set; } = new List<Unidad>();

    public ICollection<Aviso> Avisos { get; set; } = new List<Aviso>();

    public ICollection<Incidencia> Incidencias { get; set; } = new List<Incidencia>();

    public ICollection<Publicacion> Publicaciones { get; set; } = new List<Publicacion>();

    public ICollection<Evento> Eventos { get; set; } = new List<Evento>();
}