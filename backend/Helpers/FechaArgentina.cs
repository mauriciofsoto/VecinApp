
namespace VecinApp.Helpers;

public static class FechaArgentina
{
    private static readonly TimeZoneInfo ZonaHoraria = ObtenerZonaHoraria();

    private static TimeZoneInfo ObtenerZonaHoraria()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                "America/Argentina/Buenos_Aires"
            );
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                "Argentina Standard Time"
            );
        }
    }

    public static DateTime FinDelDiaUtc(DateTime fecha)
    {
        var inicioDelDiaSiguiente = DateTime.SpecifyKind(
            fecha.Date.AddDays(1),
            DateTimeKind.Unspecified
        );

        return TimeZoneInfo.ConvertTimeToUtc(
            inicioDelDiaSiguiente,
            ZonaHoraria
        ).AddTicks(-1);
    }
}
