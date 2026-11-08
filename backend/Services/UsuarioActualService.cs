using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using VecinApp.Models;

namespace VecinApp.Services;

public class UsuarioActualService
{
    private readonly UserManager<Usuario> _userManager;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UsuarioActualService(
        UserManager<Usuario> userManager,
        IHttpContextAccessor httpContextAccessor)
    {
        _userManager = userManager;
        _httpContextAccessor = httpContextAccessor;
    }

    public ClaimsPrincipal? Principal =>
        _httpContextAccessor.HttpContext?.User;

    public bool EstaAutenticado =>
        Principal?.Identity?.IsAuthenticated == true;

    public async Task<Usuario?> ObtenerAsync()
    {
        if (!EstaAutenticado)
            return null;

        return await _userManager.GetUserAsync(Principal!);
    }

    public Task<Usuario?> ObtenerActivoAsync()
    {
        return ObtenerActivoInternoAsync();
    }

    private async Task<Usuario?> ObtenerActivoInternoAsync()
    {
        var usuario = await ObtenerAsync();
        return usuario?.Estado == EstadoUsuario.Activo ? usuario : null;
    }

    public bool EsSuperAdministrador() =>
        Principal?.IsInRole("SuperAdministrador") == true;

    public bool EsAdministrador() =>
        Principal?.IsInRole("Administrador") == true;

    public bool EsEncargado() =>
        Principal?.IsInRole("Encargado") == true;

    public int? ObtenerEdificioId(Usuario? usuario) =>
        usuario?.IdEdificio;

    public async Task<int?> ObtenerEdificioActualAsync()
    {
        var usuario = await ObtenerAsync();
        return usuario?.IdEdificio;
    }
}
