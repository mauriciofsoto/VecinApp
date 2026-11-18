using System.Text.Json.Serialization;

namespace VecinApp.DTOs;

public class RegistroRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string CodigoInvitacion { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? RolEsperado { get; set; }
    [JsonPropertyName("soloValidar")]
    public bool SoloValidar { get; set; }
}
