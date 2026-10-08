namespace VecinApp.Models;

public class Notificacion
{
    public int IdNotificacion { get; set; }

    public int IdUsuario { get; set; }

    public string Tipo { get; set; } = string.Empty;

    public string Mensaje { get; set; } = string.Empty;

    public DateTime Fecha { get; set; }

    public bool Leida { get; set; }

    // Relación
    public Usuario Usuario { get; set; } = null!;
}