namespace VecinApp.Models;

public class RegistroComunitario
{
    public string IdUsuario { get; set; } = string.Empty;
    public string Perfil { get; set; } = string.Empty;
    public string OrigenDeclaracion { get; set; } = string.Empty;
    public bool? ViveEnEdificio { get; set; }
    public bool? TieneOtrasUnidades { get; set; }
    public bool? DeclaraUnidadesAlquiladas { get; set; }
    public string? ModalidadAlquiler { get; set; }
    public bool? PropietarioDeclaradoViveEnEdificio { get; set; }
    public string? PropietarioDeclaradoNombre { get; set; }
    public string? PropietarioDeclaradoApellido { get; set; }
    public string? PropietarioDeclaradoPiso { get; set; }
    public string? PropietarioDeclaradoUnidad { get; set; }
    public string? FuncionPersonal { get; set; }
    public string? FuncionPersonalOtra { get; set; }
    public string? HorarioPersonal { get; set; }
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    public Usuario Usuario { get; set; } = null!;
}
