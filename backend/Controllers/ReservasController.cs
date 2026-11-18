using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.DTOs;
using VecinApp.Models;
using VecinApp.Services;

namespace VecinApp.Controllers;

[ApiController]
[Route("api/reservas")]
[Authorize(Roles = "Administrador,Inquilino,Propietario,Portero")]
public class ReservasController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<Usuario> _userManager;
    private readonly NotificacionesService _notificacionesService;

    public ReservasController(
        AppDbContext context,
        UserManager<Usuario> userManager,
        NotificacionesService notificacionesService)
    {
        _context = context;
        _userManager = userManager;
        _notificacionesService = notificacionesService;
    }

    private async Task<(Usuario? usuario, IActionResult? error)> ObtenerUsuarioActualAsync()
    {
        var usuario = await _userManager.GetUserAsync(User);
        if (usuario == null)
            return (null, Unauthorized());

        if (usuario.Estado != EstadoUsuario.Activo || usuario.IdEdificio == null)
            return (null, Forbid());

        return (usuario, null);
    }

    private async Task LimpiarReservasVencidasAsync(int idEdificio, CancellationToken ct)
    {
        var argentinaNow = DateTime.UtcNow.AddHours(-3);
        var hoy = DateOnly.FromDateTime(argentinaNow);
        var horaActual = argentinaNow.TimeOfDay;

        var vencidas = await _context.Reservas
            .Where(r => r.IdEdificio == idEdificio &&
                        (r.Fecha < hoy || (r.Fecha == hoy && r.HoraFin <= horaActual)))
            .ToListAsync(ct);

        if (vencidas.Count > 0)
        {
            _context.Reservas.RemoveRange(vencidas);
            await _context.SaveChangesAsync(ct);
        }
    }

    private static ReservaDto MapToDto(Reserva r)
    {
        var unidadNombre = r.Unidad != null
            ? (!string.IsNullOrWhiteSpace(r.Unidad.Piso)
                ? $"Piso {r.Unidad.Piso} - {r.Unidad.Identificacion}"
                : r.Unidad.Identificacion)
            : null;

        return new ReservaDto(
            r.IdReserva,
            r.IdUsuario,
            r.Usuario != null ? $"{r.Usuario.Nombre} {r.Usuario.Apellido}".Trim() : string.Empty,
            r.IdUnidad,
            unidadNombre,
            r.IdEdificio,
            r.IdEspacioComun,
            r.Titulo,
            r.Descripcion,
            r.Fecha.ToString("yyyy-MM-dd"),
            r.HoraInicio.ToString(@"hh\:mm"),
            r.HoraFin.ToString(@"hh\:mm"),
            r.CantidadParticipantes,
            r.Estado,
            r.TipoEvento,
            r.CategoriaEvento,
            r.FechaCreacion.ToString("o"),
            r.CreadaPorAdministracion
        );
    }

    // =========================================================================
    // 1. GET /api/reservas (Administrador y Portero)
    // =========================================================================
    [HttpGet]
    [Authorize(Roles = "Administrador,Portero")]
    public async Task<IActionResult> ObtenerTodas(CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        await LimpiarReservasVencidasAsync(usuario!.IdEdificio!.Value, ct);

        var reservas = await _context.Reservas
            .AsNoTracking()
            .Include(r => r.Usuario)
            .Include(r => r.Unidad)
            .Include(r => r.EspacioComun)
            .Where(r => r.IdEdificio == usuario.IdEdificio!.Value)
            .OrderBy(r => r.Fecha)
            .ThenBy(r => r.HoraInicio)
            .Select(r => MapToDto(r))
            .ToListAsync(ct);

        return Ok(reservas);
    }

    // =========================================================================
    // 2. GET /api/reservas/mis-reservas (Residentes)
    // =========================================================================
    [HttpGet("mis-reservas")]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<IActionResult> ObtenerMisReservas(CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        await LimpiarReservasVencidasAsync(usuario!.IdEdificio!.Value, ct);

        var misReservas = await _context.Reservas
            .AsNoTracking()
            .Include(r => r.Usuario)
            .Include(r => r.Unidad)
            .Include(r => r.EspacioComun)
            .Where(r => r.IdEdificio == usuario.IdEdificio!.Value && r.IdUsuario == usuario.Id)
            .OrderBy(r => r.Fecha)
            .ThenBy(r => r.HoraInicio)
            .Select(r => MapToDto(r))
            .ToListAsync(ct);

        return Ok(misReservas);
    }

    // =========================================================================
    // 3. GET /api/reservas/{id:int}
    // =========================================================================
    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObtenerPorId(int id, CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        await LimpiarReservasVencidasAsync(usuario!.IdEdificio!.Value, ct);

        var reserva = await _context.Reservas
            .AsNoTracking()
            .Include(r => r.Usuario)
            .Include(r => r.Unidad)
            .Include(r => r.EspacioComun)
            .FirstOrDefaultAsync(r => r.IdReserva == id && r.IdEdificio == usuario.IdEdificio!.Value, ct);

        if (reserva == null)
            return NotFound(new { mensaje = "Reserva no encontrada." });

        var esAdmin = User.IsInRole("Administrador");
        if (!esAdmin && reserva.IdUsuario != usuario.Id && reserva.TipoEvento != "publico")
            return Forbid();

        return Ok(MapToDto(reserva));
    }

    // =========================================================================
    // 4. POST /api/reservas (Creación por residentes)
    // =========================================================================
    [HttpPost]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<IActionResult> CrearReserva([FromBody] CrearReservaRequest request, CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        await LimpiarReservasVencidasAsync(usuario!.IdEdificio!.Value, ct);

        // Validar unidad si fue provista
        if (request.UnidadId.HasValue)
        {
            var tieneUnidad = await _context.UsuariosUnidades
                .AnyAsync(uu => uu.IdUsuario == usuario.Id &&
                                uu.IdUnidad == request.UnidadId.Value &&
                                uu.Unidad.IdEdificio == usuario.IdEdificio!.Value, ct);
            if (!tieneUnidad)
                return BadRequest(new { mensaje = "La unidad seleccionada no pertenece al usuario en este edificio." });
        }

        // Validar espacio
        var espacio = await _context.EspaciosComunes
            .FirstOrDefaultAsync(e => e.IdEspacioComun == request.EspacioId &&
                                      e.IdEdificio == usuario.IdEdificio!.Value &&
                                      e.Activo, ct);
        if (espacio == null)
            return BadRequest(new { mensaje = "El espacio común no está disponible o no existe." });

        // Validar fechas y horas
        if (!DateOnly.TryParseExact(request.Fecha, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha))
            return BadRequest(new { mensaje = "Formato de fecha inválido. Utilice yyyy-MM-dd." });

        if (!TimeSpan.TryParseExact(request.HoraInicio, @"hh\:mm", CultureInfo.InvariantCulture, out var horaInicio))
            return BadRequest(new { mensaje = "Formato de hora de inicio inválido. Utilice HH:mm." });

        if (!TimeSpan.TryParseExact(request.HoraFin, @"hh\:mm", CultureInfo.InvariantCulture, out var horaFin))
            return BadRequest(new { mensaje = "Formato de hora de fin inválido. Utilice HH:mm." });

        if (horaInicio >= horaFin)
            return BadRequest(new { mensaje = "La hora de inicio debe ser anterior a la hora de fin." });

        var ahoraArgentina = DateTime.UtcNow.AddHours(-3);
        var inicioDateTime = fecha.ToDateTime(TimeOnly.FromTimeSpan(horaInicio));
        if (inicioDateTime <= ahoraArgentina)
            return BadRequest(new { mensaje = "No se pueden realizar reservas para fechas u horarios pasados." });

        if (horaInicio < espacio.HoraApertura || horaFin > espacio.HoraCierre)
            return BadRequest(new { mensaje = $"El horario solicitado está fuera del horario de funcionamiento del espacio ({espacio.HoraApertura:hh\\:mm} a {espacio.HoraCierre:hh\\:mm})." });

        if (request.CantidadParticipantes < 1 || request.CantidadParticipantes > espacio.CapacidadMaxima)
            return BadRequest(new { mensaje = $"La cantidad de participantes excede la capacidad máxima del espacio ({espacio.CapacidadMaxima} personas)." });

        // Validar conflicto de horario
        var hayConflicto = await _context.Reservas
            .AnyAsync(r => r.IdEspacioComun == request.EspacioId &&
                           r.Fecha == fecha &&
                           (r.Estado == "pendiente" || r.Estado == "confirmada") &&
                           r.HoraInicio < horaFin &&
                           r.HoraFin > horaInicio, ct);

        if (hayConflicto)
            return Conflict(new { mensaje = "El espacio común ya se encuentra reservado en ese horario." });

        var reserva = new Reserva
        {
            IdEdificio = usuario.IdEdificio!.Value,
            IdUsuario = usuario.Id,
            IdUnidad = request.UnidadId,
            IdEspacioComun = request.EspacioId,
            Titulo = request.Titulo.Trim(),
            Descripcion = request.Descripcion.Trim(),
            Fecha = fecha,
            HoraInicio = horaInicio,
            HoraFin = horaFin,
            CantidadParticipantes = request.CantidadParticipantes,
            Estado = "pendiente",
            TipoEvento = string.IsNullOrWhiteSpace(request.TipoEvento) ? "privado" : request.TipoEvento.Trim().ToLowerInvariant(),
            CategoriaEvento = request.CategoriaEvento?.Trim().ToLowerInvariant(),
            CreadaPorAdministracion = false,
            FechaCreacion = DateTime.UtcNow
        };

        _context.Reservas.Add(reserva);
        await _context.SaveChangesAsync(ct);

        // Notificar a la administración
        await _notificacionesService.NotificarAAdministradoresAsync(
            usuario.IdEdificio!.Value,
            tipo: "Sistema",
            mensaje: $"El residente {usuario.Nombre} {usuario.Apellido} solicitó una reserva para '{reserva.Titulo}' en {espacio.Nombre}.",
            titulo: "Nueva solicitud de reserva",
            ruta: "/gestionar-reservas");

        // Cargar relaciones para respuesta
        await _context.Entry(reserva).Reference(r => r.Usuario).LoadAsync(ct);
        if (reserva.IdUnidad.HasValue)
            await _context.Entry(reserva).Reference(r => r.Unidad).LoadAsync(ct);
        await _context.Entry(reserva).Reference(r => r.EspacioComun).LoadAsync(ct);

        return CreatedAtAction(nameof(ObtenerPorId), new { id = reserva.IdReserva }, MapToDto(reserva));
    }

    // =========================================================================
    // 5. POST /api/reservas/admin (Creación de evento comunitario por administración)
    // =========================================================================
    [HttpPost("admin")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> CrearEventoAdmin([FromBody] CrearEventoAdminRequest request, CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        await LimpiarReservasVencidasAsync(usuario!.IdEdificio!.Value, ct);

        var espacio = await _context.EspaciosComunes
            .FirstOrDefaultAsync(e => e.IdEspacioComun == request.EspacioId &&
                                      e.IdEdificio == usuario.IdEdificio!.Value &&
                                      e.Activo, ct);
        if (espacio == null)
            return BadRequest(new { mensaje = "El espacio común no está disponible o no existe." });

        if (!DateOnly.TryParseExact(request.Fecha, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha))
            return BadRequest(new { mensaje = "Formato de fecha inválido. Utilice yyyy-MM-dd." });

        if (!TimeSpan.TryParseExact(request.HoraInicio, @"hh\:mm", CultureInfo.InvariantCulture, out var horaInicio))
            return BadRequest(new { mensaje = "Formato de hora de inicio inválido. Utilice HH:mm." });

        if (!TimeSpan.TryParseExact(request.HoraFin, @"hh\:mm", CultureInfo.InvariantCulture, out var horaFin))
            return BadRequest(new { mensaje = "Formato de hora de fin inválido. Utilice HH:mm." });

        if (horaInicio >= horaFin)
            return BadRequest(new { mensaje = "La hora de inicio debe ser anterior a la hora de fin." });

        var ahoraArgentina = DateTime.UtcNow.AddHours(-3);
        var inicioDateTime = fecha.ToDateTime(TimeOnly.FromTimeSpan(horaInicio));
        if (inicioDateTime <= ahoraArgentina)
            return BadRequest(new { mensaje = "No se pueden crear eventos para fechas u horarios pasados." });

        if (horaInicio < espacio.HoraApertura || horaFin > espacio.HoraCierre)
            return BadRequest(new { mensaje = $"El horario solicitado está fuera del horario del espacio ({espacio.HoraApertura:hh\\:mm} a {espacio.HoraCierre:hh\\:mm})." });

        if (request.CantidadParticipantes < 1 || request.CantidadParticipantes > espacio.CapacidadMaxima)
            return BadRequest(new { mensaje = $"La cantidad de participantes excede la capacidad máxima del espacio ({espacio.CapacidadMaxima} personas)." });

        // Validar conflicto de horario
        var hayConflicto = await _context.Reservas
            .AnyAsync(r => r.IdEspacioComun == request.EspacioId &&
                           r.Fecha == fecha &&
                           (r.Estado == "pendiente" || r.Estado == "confirmada") &&
                           r.HoraInicio < horaFin &&
                           r.HoraFin > horaInicio, ct);

        if (hayConflicto)
            return Conflict(new { mensaje = "El espacio común ya se encuentra reservado en ese horario." });

        var reserva = new Reserva
        {
            IdEdificio = usuario.IdEdificio!.Value,
            IdUsuario = usuario.Id,
            IdUnidad = null,
            IdEspacioComun = request.EspacioId,
            Titulo = request.Titulo.Trim(),
            Descripcion = request.Descripcion.Trim(),
            Fecha = fecha,
            HoraInicio = horaInicio,
            HoraFin = horaFin,
            CantidadParticipantes = request.CantidadParticipantes,
            Estado = "confirmada", // Evento de administración nace confirmado directamente
            TipoEvento = "publico",
            CategoriaEvento = request.CategoriaEvento?.Trim().ToLowerInvariant() ?? "actividad-comunitaria",
            CreadaPorAdministracion = true,
            FechaCreacion = DateTime.UtcNow
        };

        _context.Reservas.Add(reserva);
        await _context.SaveChangesAsync(ct);

        // Crear invitaciones para todos los residentes activos del edificio
        var residentes = await _context.Users
            .AsNoTracking()
            .Where(u => u.IdEdificio == usuario.IdEdificio!.Value &&
                        u.Estado == EstadoUsuario.Activo &&
                        u.Id != usuario.Id)
            .Select(u => u.Id)
            .ToListAsync(ct);

        if (residentes.Count > 0)
        {
            var invitaciones = residentes.Select(residenteId => new InvitacionEvento
            {
                IdReserva = reserva.IdReserva,
                IdUsuario = residenteId,
                EstadoRespuesta = "pendiente",
                FechaActualizacion = DateTime.UtcNow
            });

            await _context.InvitacionesEvento.AddRangeAsync(invitaciones, ct);
            await _context.SaveChangesAsync(ct);

            // Notificar a todos los residentes
            await _notificacionesService.CrearParaUsuariosAsync(
                residentes,
                tipo: "Sistema",
                mensaje: $"La administración organizó el evento '{reserva.Titulo}' en {espacio.Nombre}.",
                titulo: "Nuevo evento comunitario",
                ruta: "/mis-reservas");
        }

        // Cargar relaciones para respuesta
        await _context.Entry(reserva).Reference(r => r.Usuario).LoadAsync(ct);
        await _context.Entry(reserva).Reference(r => r.EspacioComun).LoadAsync(ct);

        return CreatedAtAction(nameof(ObtenerPorId), new { id = reserva.IdReserva }, MapToDto(reserva));
    }

    // =========================================================================
    // 6. PUT /api/reservas/{id:int} (Edición por el residente titular)
    // =========================================================================
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<IActionResult> EditarReserva(int id, [FromBody] EditarReservaRequest request, CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        await LimpiarReservasVencidasAsync(usuario!.IdEdificio!.Value, ct);

        var reserva = await _context.Reservas
            .Include(r => r.EspacioComun)
            .FirstOrDefaultAsync(r => r.IdReserva == id && r.IdEdificio == usuario.IdEdificio!.Value, ct);

        if (reserva == null)
            return NotFound(new { mensaje = "Reserva no encontrada." });

        if (reserva.IdUsuario != usuario.Id)
            return Forbid();

        if (reserva.Estado == "rechazada" || reserva.Estado == "cancelada")
            return Conflict(new { mensaje = "Una reserva rechazada o cancelada no puede ser editada. Debe crear una nueva solicitud." });

        // Validar unidad si fue provista
        if (request.UnidadId.HasValue)
        {
            var tieneUnidad = await _context.UsuariosUnidades
                .AnyAsync(uu => uu.IdUsuario == usuario.Id &&
                                uu.IdUnidad == request.UnidadId.Value &&
                                uu.Unidad.IdEdificio == usuario.IdEdificio!.Value, ct);
            if (!tieneUnidad)
                return BadRequest(new { mensaje = "La unidad seleccionada no pertenece al usuario en este edificio." });
        }

        var espacio = await _context.EspaciosComunes
            .FirstOrDefaultAsync(e => e.IdEspacioComun == request.EspacioId &&
                                      e.IdEdificio == usuario.IdEdificio!.Value &&
                                      e.Activo, ct);
        if (espacio == null)
            return BadRequest(new { mensaje = "El espacio común no está disponible o no existe." });

        if (!DateOnly.TryParseExact(request.Fecha, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha))
            return BadRequest(new { mensaje = "Formato de fecha inválido. Utilice yyyy-MM-dd." });

        if (!TimeSpan.TryParseExact(request.HoraInicio, @"hh\:mm", CultureInfo.InvariantCulture, out var horaInicio))
            return BadRequest(new { mensaje = "Formato de hora de inicio inválido. Utilice HH:mm." });

        if (!TimeSpan.TryParseExact(request.HoraFin, @"hh\:mm", CultureInfo.InvariantCulture, out var horaFin))
            return BadRequest(new { mensaje = "Formato de hora de fin inválido. Utilice HH:mm." });

        if (horaInicio >= horaFin)
            return BadRequest(new { mensaje = "La hora de inicio debe ser anterior a la hora de fin." });

        var ahoraArgentina = DateTime.UtcNow.AddHours(-3);
        var inicioDateTime = fecha.ToDateTime(TimeOnly.FromTimeSpan(horaInicio));
        if (inicioDateTime <= ahoraArgentina)
            return BadRequest(new { mensaje = "No se pueden realizar reservas para fechas u horarios pasados." });

        if (horaInicio < espacio.HoraApertura || horaFin > espacio.HoraCierre)
            return BadRequest(new { mensaje = $"El horario solicitado está fuera del horario del espacio ({espacio.HoraApertura:hh\\:mm} a {espacio.HoraCierre:hh\\:mm})." });

        if (request.CantidadParticipantes < 1 || request.CantidadParticipantes > espacio.CapacidadMaxima)
            return BadRequest(new { mensaje = $"La cantidad de participantes excede la capacidad máxima del espacio ({espacio.CapacidadMaxima} personas)." });

        // Validar conflicto de horario excluyendo la reserva actual
        var hayConflicto = await _context.Reservas
            .AnyAsync(r => r.IdReserva != id &&
                           r.IdEspacioComun == request.EspacioId &&
                           r.Fecha == fecha &&
                           (r.Estado == "pendiente" || r.Estado == "confirmada") &&
                           r.HoraInicio < horaFin &&
                           r.HoraFin > horaInicio, ct);

        if (hayConflicto)
            return Conflict(new { mensaje = "El espacio común ya se encuentra reservado en ese horario por otra solicitud." });

        // Reglas de transición de estado:
        // Si estaba confirmada y cambia fecha u horario, pasa a pendiente para requerir aprobación administrativa.
        var cambioHorario = reserva.Fecha != fecha || reserva.HoraInicio != horaInicio || reserva.HoraFin != horaFin || reserva.IdEspacioComun != request.EspacioId;
        var pasoAPendiente = false;

        if (reserva.Estado == "confirmada" && cambioHorario)
        {
            reserva.Estado = "pendiente";
            pasoAPendiente = true;
        }

        reserva.IdEspacioComun = request.EspacioId;
        reserva.IdUnidad = request.UnidadId;
        reserva.Titulo = request.Titulo.Trim();
        reserva.Descripcion = request.Descripcion.Trim();
        reserva.Fecha = fecha;
        reserva.HoraInicio = horaInicio;
        reserva.HoraFin = horaFin;
        reserva.CantidadParticipantes = request.CantidadParticipantes;
        if (!string.IsNullOrWhiteSpace(request.TipoEvento))
            reserva.TipoEvento = request.TipoEvento.Trim().ToLowerInvariant();
        if (request.CategoriaEvento != null)
            reserva.CategoriaEvento = request.CategoriaEvento.Trim().ToLowerInvariant();

        await _context.SaveChangesAsync(ct);

        if (pasoAPendiente)
        {
            await _notificacionesService.NotificarAAdministradoresAsync(
                usuario.IdEdificio!.Value,
                tipo: "Sistema",
                mensaje: $"El residente {usuario.Nombre} {usuario.Apellido} modificó la fecha u horario de su reserva '{reserva.Titulo}', quedando pendiente de aprobación.",
                titulo: "Reserva modificada",
                ruta: "/gestionar-reservas");
        }

        await _context.Entry(reserva).Reference(r => r.Usuario).LoadAsync(ct);
        if (reserva.IdUnidad.HasValue)
            await _context.Entry(reserva).Reference(r => r.Unidad).LoadAsync(ct);
        await _context.Entry(reserva).Reference(r => r.EspacioComun).LoadAsync(ct);

        return Ok(MapToDto(reserva));
    }

    // =========================================================================
    // 7. POST /api/reservas/{id:int}/confirmar (Administrador)
    // =========================================================================
    [HttpPost("{id:int}/confirmar")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> ConfirmarReserva(int id, CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        await LimpiarReservasVencidasAsync(usuario!.IdEdificio!.Value, ct);

        var reserva = await _context.Reservas
            .Include(r => r.Usuario)
            .Include(r => r.Unidad)
            .Include(r => r.EspacioComun)
            .FirstOrDefaultAsync(r => r.IdReserva == id && r.IdEdificio == usuario.IdEdificio!.Value, ct);

        if (reserva == null)
            return NotFound(new { mensaje = "Reserva no encontrada." });

        if (reserva.Estado != "pendiente")
            return BadRequest(new { mensaje = "Solo se pueden confirmar reservas que estén en estado pendiente." });

        // Verificar que no haya otra reserva confirmada en conflicto
        var hayConflicto = await _context.Reservas
            .AnyAsync(r => r.IdReserva != id &&
                           r.IdEspacioComun == reserva.IdEspacioComun &&
                           r.Fecha == reserva.Fecha &&
                           r.Estado == "confirmada" &&
                           r.HoraInicio < reserva.HoraFin &&
                           r.HoraFin > reserva.HoraInicio, ct);

        if (hayConflicto)
            return Conflict(new { mensaje = "Existe otra reserva ya confirmada en el mismo espacio y horario." });

        reserva.Estado = "confirmada";
        await _context.SaveChangesAsync(ct);

        // Si es pública, crear invitaciones si no existen
        if (reserva.TipoEvento == "publico")
        {
            var residentes = await _context.Users
                .AsNoTracking()
                .Where(u => u.IdEdificio == usuario.IdEdificio!.Value &&
                            u.Estado == EstadoUsuario.Activo &&
                            u.Id != reserva.IdUsuario)
                .Select(u => u.Id)
                .ToListAsync(ct);

            var yaInvitados = await _context.InvitacionesEvento
                .Where(i => i.IdReserva == id)
                .Select(i => i.IdUsuario)
                .ToListAsync(ct);

            var nuevosInvitados = residentes.Except(yaInvitados).ToList();
            if (nuevosInvitados.Count > 0)
            {
                var invitaciones = nuevosInvitados.Select(uid => new InvitacionEvento
                {
                    IdReserva = reserva.IdReserva,
                    IdUsuario = uid,
                    EstadoRespuesta = "pendiente",
                    FechaActualizacion = DateTime.UtcNow
                });
                await _context.InvitacionesEvento.AddRangeAsync(invitaciones, ct);
                await _context.SaveChangesAsync(ct);

                await _notificacionesService.CrearParaUsuariosAsync(
                    nuevosInvitados,
                    tipo: "Sistema",
                    mensaje: $"Se publicó el evento comunitario '{reserva.Titulo}' en {reserva.EspacioComun.Nombre}.",
                    titulo: "Nuevo evento comunitario",
                    ruta: "/mis-reservas");
            }
        }

        // Notificar al residente titular
        await _notificacionesService.CrearParaUsuariosAsync(
            new[] { reserva.IdUsuario },
            tipo: "Sistema",
            mensaje: $"Tu reserva para '{reserva.Titulo}' ha sido confirmada por la administración.",
            titulo: "Reserva confirmada",
            ruta: "/mis-reservas");

        return Ok(MapToDto(reserva));
    }

    // =========================================================================
    // 8. POST /api/reservas/{id:int}/rechazar (Administrador)
    // =========================================================================
    [HttpPost("{id:int}/rechazar")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> RechazarReserva(int id, [FromBody] RechazarReservaRequest? request, CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        await LimpiarReservasVencidasAsync(usuario!.IdEdificio!.Value, ct);

        var reserva = await _context.Reservas
            .Include(r => r.Usuario)
            .Include(r => r.Unidad)
            .Include(r => r.EspacioComun)
            .FirstOrDefaultAsync(r => r.IdReserva == id && r.IdEdificio == usuario.IdEdificio!.Value, ct);

        if (reserva == null)
            return NotFound(new { mensaje = "Reserva no encontrada." });

        if (reserva.Estado != "pendiente")
            return BadRequest(new { mensaje = "Solo se pueden rechazar reservas que estén en estado pendiente." });

        reserva.Estado = "rechazada";

        if (!string.IsNullOrWhiteSpace(request?.Motivo))
        {
            _context.MensajesReserva.Add(new MensajeReserva
            {
                IdReserva = id,
                IdUsuarioEmisor = usuario.Id,
                Contenido = $"Reserva rechazada. Motivo: {request.Motivo.Trim()}",
                FechaCreacion = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync(ct);

        var detalleMotivo = !string.IsNullOrWhiteSpace(request?.Motivo)
            ? $" Motivo: {request.Motivo.Trim()}"
            : string.Empty;

        await _notificacionesService.CrearParaUsuariosAsync(
            new[] { reserva.IdUsuario },
            tipo: "Sistema",
            mensaje: $"Tu reserva para '{reserva.Titulo}' fue rechazada por la administración.{detalleMotivo}",
            titulo: "Reserva rechazada",
            ruta: "/mis-reservas");

        return Ok(MapToDto(reserva));
    }

    // =========================================================================
    // 9. POST /api/reservas/{id:int}/cancelar (Residente titular o Administrador)
    // =========================================================================
    [HttpPost("{id:int}/cancelar")]
    [Authorize(Roles = "Administrador,Inquilino,Propietario")]
    public async Task<IActionResult> CancelarReserva(int id, CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        await LimpiarReservasVencidasAsync(usuario!.IdEdificio!.Value, ct);

        var reserva = await _context.Reservas
            .Include(r => r.Usuario)
            .Include(r => r.Unidad)
            .Include(r => r.EspacioComun)
            .FirstOrDefaultAsync(r => r.IdReserva == id && r.IdEdificio == usuario.IdEdificio!.Value, ct);

        if (reserva == null)
            return NotFound(new { mensaje = "Reserva no encontrada." });

        var esAdmin = User.IsInRole("Administrador");
        if (!esAdmin && reserva.IdUsuario != usuario.Id)
            return Forbid();

        if (reserva.Estado == "cancelada" || reserva.Estado == "rechazada")
            return BadRequest(new { mensaje = "La reserva ya se encuentra cancelada o rechazada." });

        reserva.Estado = "cancelada";
        await _context.SaveChangesAsync(ct);

        if (esAdmin)
        {
            await _notificacionesService.CrearParaUsuariosAsync(
                new[] { reserva.IdUsuario },
                tipo: "Sistema",
                mensaje: $"Tu reserva para '{reserva.Titulo}' fue cancelada por la administración.",
                titulo: "Reserva cancelada",
                ruta: "/mis-reservas");
        }
        else
        {
            await _notificacionesService.NotificarAAdministradoresAsync(
                usuario.IdEdificio!.Value,
                tipo: "Sistema",
                mensaje: $"El residente {usuario.Nombre} {usuario.Apellido} canceló su reserva para '{reserva.Titulo}'.",
                titulo: "Reserva cancelada por el residente",
                ruta: "/gestionar-reservas");
        }

        return Ok(MapToDto(reserva));
    }

    // =========================================================================
    // 10. GET /api/reservas/{id:int}/mensajes (Chat)
    // =========================================================================
    [HttpGet("{id:int}/mensajes")]
    [Authorize(Roles = "Administrador,Inquilino,Propietario,Portero")]
    public async Task<IActionResult> ObtenerMensajes(int id, CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        var reserva = await _context.Reservas
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.IdReserva == id && r.IdEdificio == usuario!.IdEdificio!.Value, ct);

        if (reserva == null)
            return NotFound(new { mensaje = "Reserva no encontrada." });

        var esAdmin = User.IsInRole("Administrador");
        var esPortero = User.IsInRole("Portero");
        if (!esAdmin && !esPortero && reserva.IdUsuario != usuario.Id && reserva.TipoEvento != "publico")
            return Forbid();

        var mensajes = await _context.MensajesReserva
            .AsNoTracking()
            .Include(m => m.UsuarioEmisor)
            .ThenInclude(u => u.Rol)
            .Where(m => m.IdReserva == id)
            .OrderBy(m => m.FechaCreacion)
            .Select(m => new MensajeReservaDto(
                m.IdMensajeReserva,
                m.IdReserva,
                m.IdUsuarioEmisor,
                $"{m.UsuarioEmisor.Nombre} {m.UsuarioEmisor.Apellido}".Trim(),
                m.UsuarioEmisor.Rol != null && m.UsuarioEmisor.Rol.Nombre == "Administrador"
                    ? "administracion"
                    : "residente",
                m.Contenido,
                m.FechaCreacion.ToString("o")
            ))
            .ToListAsync(ct);

        return Ok(mensajes);
    }

    // =========================================================================
    // 11. POST /api/reservas/{id:int}/mensajes (Chat)
    // =========================================================================
    [HttpPost("{id:int}/mensajes")]
    [Authorize(Roles = "Administrador,Inquilino,Propietario")]
    public async Task<IActionResult> EnviarMensaje(int id, [FromBody] CrearMensajeRequest request, CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        if (string.IsNullOrWhiteSpace(request.Contenido))
            return BadRequest(new { mensaje = "El contenido del mensaje no puede estar vacío." });

        var reserva = await _context.Reservas
            .Include(r => r.Usuario)
            .FirstOrDefaultAsync(r => r.IdReserva == id && r.IdEdificio == usuario!.IdEdificio!.Value, ct);

        if (reserva == null)
            return NotFound(new { mensaje = "Reserva no encontrada." });

        var esAdmin = User.IsInRole("Administrador");
        if (!esAdmin && reserva.IdUsuario != usuario.Id && reserva.TipoEvento != "publico")
            return Forbid();

        var mensaje = new MensajeReserva
        {
            IdReserva = id,
            IdUsuarioEmisor = usuario.Id,
            Contenido = request.Contenido.Trim(),
            FechaCreacion = DateTime.UtcNow
        };

        _context.MensajesReserva.Add(mensaje);
        await _context.SaveChangesAsync(ct);

        await _context.Entry(mensaje).Reference(m => m.UsuarioEmisor).LoadAsync(ct);
        if (mensaje.UsuarioEmisor.IdRol.HasValue)
            await _context.Entry(mensaje.UsuarioEmisor).Reference(u => u.Rol).LoadAsync(ct);

        var rolEmisor = esAdmin ? "administracion" : "residente";

        // Notificaciones: si escribe el residente -> notificar admin; si escribe admin -> notificar residente
        if (esAdmin)
        {
            if (reserva.IdUsuario != usuario.Id)
            {
                await _notificacionesService.CrearParaUsuariosAsync(
                    new[] { reserva.IdUsuario },
                    tipo: "Mensaje",
                    mensaje: $"{usuario.Nombre}: {mensaje.Contenido}",
                    titulo: $"Nuevo mensaje en reserva '{reserva.Titulo}'",
                    ruta: "/mis-reservas");
            }
        }
        else
        {
            await _notificacionesService.NotificarAAdministradoresAsync(
                usuario.IdEdificio!.Value,
                tipo: "Mensaje",
                mensaje: $"{usuario.Nombre}: {mensaje.Contenido}",
                titulo: $"Nuevo mensaje en reserva '{reserva.Titulo}'",
                ruta: "/gestionar-reservas");
        }

        var dto = new MensajeReservaDto(
            mensaje.IdMensajeReserva,
            mensaje.IdReserva,
            mensaje.IdUsuarioEmisor,
            $"{mensaje.UsuarioEmisor.Nombre} {mensaje.UsuarioEmisor.Apellido}".Trim(),
            rolEmisor,
            mensaje.Contenido,
            mensaje.FechaCreacion.ToString("o")
        );

        return Created($"/api/reservas/{id}/mensajes/{mensaje.IdMensajeReserva}", dto);
    }

    // =========================================================================
    // 12. GET /api/reservas/eventos-publicos (Cartelera de eventos comunitarios)
    // =========================================================================
    [HttpGet("eventos-publicos")]
    public async Task<IActionResult> ObtenerEventosPublicos(CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        await LimpiarReservasVencidasAsync(usuario!.IdEdificio!.Value, ct);

        var eventos = await _context.Reservas
            .AsNoTracking()
            .Include(r => r.Usuario)
            .Include(r => r.EspacioComun)
            .Include(r => r.Invitaciones)
            .Where(r => r.IdEdificio == usuario.IdEdificio!.Value &&
                        r.TipoEvento == "publico" &&
                        r.Estado == "confirmada")
            .OrderBy(r => r.Fecha)
            .ThenBy(r => r.HoraInicio)
            .Select(r => new EventoPublicoDto(
                r.IdReserva,
                r.IdReserva,
                r.Titulo,
                r.Descripcion,
                r.Fecha.ToString("yyyy-MM-dd"),
                r.HoraInicio.ToString(@"hh\:mm"),
                r.HoraFin.ToString(@"hh\:mm"),
                r.EspacioComun.Nombre,
                $"{r.Usuario.Nombre} {r.Usuario.Apellido}".Trim(),
                r.CategoriaEvento,
                r.Invitaciones.Count(i => i.EstadoRespuesta == "asistira"),
                r.Invitaciones
                    .Where(i => i.IdUsuario == usuario.Id)
                    .Select(i => i.EstadoRespuesta)
                    .FirstOrDefault()
            ))
            .ToListAsync(ct);

        return Ok(eventos);
    }

    // =========================================================================
    // 13. POST /api/reservas/{id:int}/invitaciones/responder (RSVP a evento público)
    // =========================================================================
    [HttpPost("{id:int}/invitaciones/responder")]
    [Authorize(Roles = "Inquilino,Propietario")]
    public async Task<IActionResult> ResponderInvitacion(int id, [FromBody] ResponderInvitacionRequest request, CancellationToken ct)
    {
        var (usuario, error) = await ObtenerUsuarioActualAsync();
        if (error != null) return error;

        var estado = request.EstadoRespuesta?.Trim().ToLowerInvariant();
        if (estado != "asistira" && estado != "no_asistira" && estado != "pendiente")
            return BadRequest(new { mensaje = "Estado de respuesta inválido. Utilice 'asistira' o 'no_asistira'." });

        var reserva = await _context.Reservas
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.IdReserva == id &&
                                      r.IdEdificio == usuario!.IdEdificio!.Value &&
                                      r.TipoEvento == "publico" &&
                                      r.Estado == "confirmada", ct);

        if (reserva == null)
            return NotFound(new { mensaje = "Evento público no encontrado o no disponible." });

        var invitacion = await _context.InvitacionesEvento
            .FirstOrDefaultAsync(i => i.IdReserva == id && i.IdUsuario == usuario.Id, ct);

        if (invitacion == null)
        {
            invitacion = new InvitacionEvento
            {
                IdReserva = id,
                IdUsuario = usuario.Id,
                EstadoRespuesta = estado,
                FechaActualizacion = DateTime.UtcNow
            };
            _context.InvitacionesEvento.Add(invitacion);
        }
        else
        {
            invitacion.EstadoRespuesta = estado;
            invitacion.FechaActualizacion = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(ct);

        return Ok(new { mensaje = "Respuesta registrada correctamente.", estadoRespuesta = invitacion.EstadoRespuesta });
    }
}
