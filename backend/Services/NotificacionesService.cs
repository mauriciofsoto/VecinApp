using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.DTOs;
using VecinApp.Models;

namespace VecinApp.Services;

public class NotificacionesService
{
    private readonly AppDbContext _context;

    public NotificacionesService(AppDbContext context)
    {
        _context = context;
    }

    // =====================================================
    // CREAR NOTIFICACIONES
    // =====================================================

    public async Task CrearParaUsuariosAsync(
        IEnumerable<string> idsUsuarios,
        string tipo,
        string mensaje,
        string? titulo = null,
        string? ruta = null)
    {
        var destinatarios = idsUsuarios
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();

        if (destinatarios.Count == 0)
            return;

        var fecha = DateTime.UtcNow;

        var notificaciones = destinatarios.Select(id => new Notificacion
        {
            IdUsuario = id,
            Titulo = titulo ?? tipo,
            Tipo = tipo,
            Mensaje = mensaje,
            Fecha = fecha,
            Leida = false,
            Ruta = ruta
        });

        await _context.Notificaciones.AddRangeAsync(notificaciones);
        await _context.SaveChangesAsync();
    }

    // =====================================================
    // DESTINATARIOS POR EDIFICIO
    // =====================================================

    public async Task NotificarAUsuariosDelEdificioAsync(
        int idEdificio,
        string idUsuarioExcluido,
        string tipo,
        string mensaje)
    {
        var destinatarios = await _context.Users
            .AsNoTracking()
            .Where(u =>
                u.IdEdificio == idEdificio &&
                u.Estado == EstadoUsuario.Activo &&
                u.Id != idUsuarioExcluido)
            .Select(u => u.Id)
            .ToListAsync();

        await CrearParaUsuariosAsync(destinatarios, tipo, mensaje);
    }

    // =====================================================
    // DESTINATARIOS ADMINISTRADORES
    // =====================================================

    public async Task NotificarAAdministradoresAsync(
        int idEdificio,
        string tipo,
        string mensaje,
        string? titulo = null,
        string? ruta = null)
    {
        var destinatarios = await _context.Users
            .AsNoTracking()
            .Where(u =>
                u.IdEdificio == idEdificio &&
                u.Estado == EstadoUsuario.Activo &&
                u.Rol != null &&
                u.Rol.Nombre == "Administrador")
            .Select(u => u.Id)
            .ToListAsync();

        await CrearParaUsuariosAsync(destinatarios, tipo, mensaje, titulo, ruta);
    }

    // =====================================================
    // DESTINATARIOS POR UNIDAD
    // =====================================================

    public async Task NotificarAUsuariosDeUnidadAsync(
        int idUnidad,
        string idUsuarioExcluido,
        string tipo,
        string mensaje)
    {
        var destinatarios = await _context.UsuariosUnidades
            .AsNoTracking()
            .Where(uu =>
                uu.IdUnidad == idUnidad &&
                uu.Usuario.Estado == EstadoUsuario.Activo &&
                uu.IdUsuario != idUsuarioExcluido)
            .Select(uu => uu.IdUsuario)
            .Distinct()
            .ToListAsync();

        await CrearParaUsuariosAsync(destinatarios, tipo, mensaje);
    }

    // =====================================================
    // LISTAR NOTIFICACIONES
    // =====================================================

    public async Task<List<NotificacionDto>> ListarAsync(
        string idUsuario)
    {
        return await _context.Notificaciones
            .AsNoTracking()
            .Where(n => n.IdUsuario == idUsuario)
            .OrderByDescending(n => n.Fecha)
            .Select(n => new NotificacionDto(
                n.IdNotificacion,
                n.Titulo,
                n.Tipo,
                n.Mensaje,
                n.Fecha,
                n.Leida,
                n.Ruta
            ))
            .ToListAsync();
    }

    public Task<int> ContarNoLeidasAsync(string idUsuario)
    {
        return _context.Notificaciones.CountAsync(n =>
            n.IdUsuario == idUsuario && !n.Leida);
    }

    // =====================================================
    // MARCAR UNA COMO LEÍDA
    // =====================================================

    public async Task<bool> MarcarComoLeidaAsync(
        int idNotificacion,
        string idUsuario)
    {
        var notificacion = await _context.Notificaciones
            .FirstOrDefaultAsync(n =>
                n.IdNotificacion == idNotificacion &&
                n.IdUsuario == idUsuario);

        if (notificacion == null)
            return false;

        if (!notificacion.Leida)
        {
            notificacion.Leida = true;
            await _context.SaveChangesAsync();
        }

        return true;
    }

    // =====================================================
    // MARCAR TODAS COMO LEÍDAS
    // =====================================================

    public async Task MarcarTodasComoLeidasAsync(string idUsuario)
    {
        await _context.Notificaciones
            .Where(n => n.IdUsuario == idUsuario && !n.Leida)
            .ExecuteUpdateAsync(setters =>
                setters.SetProperty(n => n.Leida, true));
    }
}
