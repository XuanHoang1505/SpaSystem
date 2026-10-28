namespace NhuNguyetSpa.Application.Common;

/// <summary>The spa's local calendar (ADR-0003: Asia/Ho_Chi_Minh, no daylight saving).</summary>
public static class SpaTime
{
    public const string TimeZoneId = "Asia/Ho_Chi_Minh";

    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);

    public static DateOnly Today(DateTime utcNow) => DateOnly.FromDateTime(ToLocal(utcNow));

    /// <summary>Wall-clock time in Vietnam for a UTC instant (for gateways that expect local timestamps).</summary>
    public static DateTime ToLocal(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone);

    /// <summary>The UTC instant of 00:00 Vietnam time on <paramref name="day"/>.</summary>
    public static DateTime StartOfDayUtc(DateOnly day) =>
        TimeZoneInfo.ConvertTimeToUtc(day.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), Zone);
}
