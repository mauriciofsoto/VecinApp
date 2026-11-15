using System.ComponentModel.DataAnnotations;

namespace VecinApp.DTOs;

public sealed class RegistroAccesoComunidadRequest
{
    [Required, MaxLength(100)] public string Nombre { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string Apellido { get; set; } = string.Empty;
    [Required, EmailAddress, MaxLength(256)] public string Email { get; set; } = string.Empty;
    [Required, MinLength(8)] public string Password { get; set; } = string.Empty;
    [Required, MaxLength(128)] public string TokenAcceso { get; set; } = string.Empty;
    [Required] public string Perfil { get; set; } = string.Empty;

    public bool? ViveEnEdificio { get; set; }
    public bool? TieneOtrasUnidades { get; set; }
    public bool? DeclaraUnidadesAlquiladas { get; set; }

    [MaxLength(40)] public string? ModalidadAlquiler { get; set; }
    public bool? PropietarioDeclaradoViveEnEdificio { get; set; }
    [MaxLength(100)] public string? PropietarioDeclaradoNombre { get; set; }
    [MaxLength(100)] public string? PropietarioDeclaradoApellido { get; set; }
    [MaxLength(100)] public string? PropietarioDeclaradoPiso { get; set; }
    [MaxLength(100)] public string? PropietarioDeclaradoUnidad { get; set; }

    [MaxLength(80)] public string? FuncionPersonal { get; set; }
    [MaxLength(120)] public string? FuncionPersonalOtra { get; set; }
    [MaxLength(200)] public string? HorarioPersonal { get; set; }

    public List<UnidadRegistroComunitarioRequest> Unidades { get; set; } = new();
}

public sealed class UnidadRegistroComunitarioRequest
{
    [Required] public string Tipo { get; set; } = string.Empty;
    [MaxLength(100)] public string? Piso { get; set; }
    [MaxLength(100)] public string? Identificacion { get; set; }
    public bool? EstaAlquilada { get; set; }
    public bool EsPrincipal { get; set; }
}
