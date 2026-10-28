namespace NhuNguyetSpa.Application.Common;

/// <summary>The spa's local calendar (ADR-0003: Asia/Ho_Chi_Minh, no daylight saving).</summary>
public static class SpaTime
{
    public const string TimeZoneId = "Asia/Ho_Chi_Minh";

    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);

    public static DateOnly Today(DateTime utcNow) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc), Zone));
}
