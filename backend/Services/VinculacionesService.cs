using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using VecinApp.Data;
using VecinApp.Models;

namespace VecinApp.Services;

public sealed class VinculacionesService
{
    private readonly AppDbContext _db;
    private readonly NotificacionesService _notifications;

    public VinculacionesService(AppDbContext db, NotificacionesService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task EvaluarAsync(string idUsuario, CancellationToken ct = default)
    {
        var usuario = await _db.Users.AsNoTracking()
            .Where(u => u.Id == idUsuario && u.Estado == EstadoUsuario.Activo && u.IdEdificio != null &&
                u.Rol != null && (u.Rol.Nombre == "Propietario" || u.Rol.Nombre == "Inquilino"))
            .Select(u => new { u.Id, Edificio = u.IdEdificio!.Value, Rol = u.Rol!.Nombre })
            .FirstOrDefaultAsync(ct);
        if (usuario == null) return;

        var declaraciones = await _db.DeclaracionesUnidadesComunitarias.AsNoTracking()
            .Include(d => d.Usuario).ThenInclude(u => u.Rol)
            .Include(d => d.Unidad)
            .Where(d => d.IdEdificio == usuario.Edificio && d.IdUnidad != null &&
                ((d.Tipo == "Titularidad" && d.EstaAlquilada == true) || d.Tipo == "Ocupacion"))
            .ToListAsync(ct);

        var propietarios = declaraciones.Where(d => d.Tipo == "Titularidad" && d.EstaAlquilada == true &&
            d.Usuario.Estado == EstadoUsuario.Activo && d.Usuario.Rol?.Nombre == "Propietario").ToList();
        var inquilinos = declaraciones.Where(d => d.Tipo == "Ocupacion" &&
            d.Usuario.Estado == EstadoUsuario.Activo && d.Usuario.Rol?.Nombre == "Inquilino").ToList();
        var idsRelacionados = declaraciones.Select(d => d.IdUsuario).Distinct().ToArray();
        var registros = await _db.RegistrosComunitarios.AsNoTracking()
            .Where(r => idsRelacionados.Contains(r.IdUsuario))
            .ToDictionaryAsync(r => r.IdUsuario, ct);

        var candidatos = (from propiedad in propietarios
                          join ocupacion in inquilinos on propiedad.IdUnidad equals ocupacion.IdUnidad
                          where propiedad.IdUsuario != ocupacion.IdUsuario &&
                              propiedad.Unidad?.IdEdificio == usuario.Edificio && ocupacion.Unidad?.IdEdificio == usuario.Edificio &&
                              propiedad.Usuario.IdEdificio == usuario.Edificio && ocupacion.Usuario.IdEdificio == usuario.Edificio &&
                             CoincideReferencia(propiedad, ocupacion.Usuario, registros) &&
CoincideReferencia(ocupacion, propiedad.Usuario, registros)
                          select new Par(propiedad, ocupacion)).ToList();

        // Una solicitud solo nace si los datos disponibles dejan un único par para esa unidad.
        var unicos = candidatos.GroupBy(p => p.Propietario.IdUnidad)
            .Where(g => g.Select(p => (p.Propietario.IdUsuario, p.Inquilino.IdUsuario)).Distinct().Count() == 1)
            .Select(g => g.First()).ToList();
        var clavesValidas = unicos.Select(p => Clave(p.Propietario.IdUsuario, p.Inquilino.IdUsuario, p.Propietario.IdUnidad!.Value)).ToHashSet();

        var pendientes = await _db.SolicitudesVinculacion
            .Where(s => s.Estado == "Pendiente" && (s.IdPropietario == idUsuario || s.IdInquilino == idUsuario))
            .ToListAsync(ct);
        foreach (var pendiente in pendientes.Where(s => !clavesValidas.Contains(Clave(s.IdPropietario, s.IdInquilino, s.IdUnidad))))
        {
            pendiente.Estado = "Cancelada";
            await _notifications.CrearParaUsuariosAsync(
                new[] { pendiente.IdPropietario, pendiente.IdInquilino }, "Vinculacion",
                "La solicitud quedó cancelada porque cambiaron las declaraciones que la originaron.",
                "Solicitud de vinculación actualizada", $"/perfil?solicitudVinculacionId={pendiente.IdSolicitudVinculacion}");
        }

        foreach (var par in unicos)
        {
            var key = Clave(par.Propietario.IdUsuario, par.Inquilino.IdUsuario, par.Propietario.IdUnidad!.Value);
            if (pendientes.Any(s => Clave(s.IdPropietario, s.IdInquilino, s.IdUnidad) == key)) continue;
            if (await _db.SolicitudesVinculacion.AnyAsync(s => s.IdPropietario == par.Propietario.IdUsuario &&
                    s.IdInquilino == par.Inquilino.IdUsuario && s.IdUnidad == par.Propietario.IdUnidad && s.Estado != "Cancelada", ct))
                continue;

            var solicitud = new SolicitudVinculacion
            {
                IdPropietario = par.Propietario.IdUsuario,
                IdInquilino = par.Inquilino.IdUsuario,
                IdUnidad = par.Propietario.IdUnidad!.Value,
                IdDeclaracionPropietario = par.Propietario.IdDeclaracionUnidad,
                IdDeclaracionInquilino = par.Inquilino.IdDeclaracionUnidad,
                Estado = "Pendiente",
                FechaCreacion = DateTime.UtcNow
            };
            _db.SolicitudesVinculacion.Add(solicitud);
            await using var transaction = _db.Database.IsRelational() && _db.Database.CurrentTransaction == null
                ? await _db.Database.BeginTransactionAsync(ct)
                : null;
            try
            {
                await _db.SaveChangesAsync(ct);
                var ruta = $"/perfil?solicitudVinculacionId={solicitud.IdSolicitudVinculacion}";
                var mensaje = $"Se encontró una posible relación de alquiler para la unidad {par.Propietario.Unidad!.Piso} / {par.Propietario.Unidad.Identificacion}. Revisá la solicitud en tu perfil.";
                await _notifications.CrearParaUsuariosAsync(new[] { solicitud.IdPropietario, solicitud.IdInquilino },
                    "Vinculacion", mensaje, "Solicitud de vinculación", ruta);
                if (transaction != null) await transaction.CommitAsync(ct);
            }
            catch (DbUpdateException)
            {
                if (transaction != null) await transaction.RollbackAsync(ct);
                _db.Entry(solicitud).State = EntityState.Detached;
                continue;
            }
        }
    }

    private bool CoincideReferencia(DeclaracionUnidadComunitaria declaracion, Usuario destino,
        IReadOnlyDictionary<string, RegistroComunitario> registros)
    {
        registros.TryGetValue(declaracion.IdUsuario, out var registro);
        var nombre = declaracion.PersonaRelacionNombre ?? (declaracion.Tipo == "Ocupacion" ? registro?.PropietarioDeclaradoNombre : null);
        var apellido = declaracion.PersonaRelacionApellido ?? (declaracion.Tipo == "Ocupacion" ? registro?.PropietarioDeclaradoApellido : null);
        var pisoReferencia = declaracion.PisoRelacion ?? (declaracion.Tipo == "Ocupacion" ? registro?.PropietarioDeclaradoPiso : null);
        var unidadReferencia = declaracion.IdentificacionRelacion ?? (declaracion.Tipo == "Ocupacion" ? registro?.PropietarioDeclaradoUnidad : null);
        var tieneNombre = !string.IsNullOrWhiteSpace(nombre) || !string.IsNullOrWhiteSpace(apellido);
        if (tieneNombre && (!CoincideParte(nombre, destino.Nombre) || !CoincideParte(apellido, destino.Apellido))) return false;

        if (!string.IsNullOrWhiteSpace(pisoReferencia) || !string.IsNullOrWhiteSpace(unidadReferencia))
        {
            var tipoResidencia = destino.Rol?.Nombre == "Propietario" ? "Residencia" : "Ocupacion";
            var ubicaciones = _db.DeclaracionesUnidadesComunitarias.AsNoTracking()
                .Where(d => d.IdUsuario == destino.Id && d.IdEdificio == declaracion.IdEdificio && d.Tipo == tipoResidencia);
            if (!ubicaciones.Any(d => (string.IsNullOrWhiteSpace(pisoReferencia) || Normalizar(d.PisoDeclarado) == Normalizar(pisoReferencia)) &&
                                      (string.IsNullOrWhiteSpace(unidadReferencia) || Normalizar(d.IdentificacionDeclarada) == Normalizar(unidadReferencia))))
                return false;
        }
        return true;
    }

    private static bool CoincideParte(string? declarado, string real)
    {
        if (string.IsNullOrWhiteSpace(declarado)) return true;
        var referencia = Normalizar(declarado);
        var datoReal = Normalizar(real);
        return referencia.Length > 0 && datoReal.StartsWith(referencia, StringComparison.Ordinal);
    }

    private static string Normalizar(string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor)) return string.Empty;
        var separado = valor.Normalize(NormalizationForm.FormD);
        var sinDiacriticos = new string(separado.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray());
        return string.Join(' ', sinDiacriticos.Normalize(NormalizationForm.FormC).Trim().ToUpperInvariant()
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }

    private static string Clave(string propietario, string inquilino, int unidad) => $"{propietario}|{inquilino}|{unidad}";
    private sealed record Par(DeclaracionUnidadComunitaria Propietario, DeclaracionUnidadComunitaria Inquilino);
}
