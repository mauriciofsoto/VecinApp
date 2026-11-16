using System.ComponentModel.DataAnnotations;

namespace VecinApp.DTOs;

public sealed class ActualizarPerfilRequest
{
    [Required, StringLength(100)]
    public string Nombre { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string Apellido { get; set; } = string.Empty;

    [Phone, StringLength(30)]
    public string? Telefono { get; set; }
}
