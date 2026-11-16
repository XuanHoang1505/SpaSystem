using System.Globalization;
using NhuNguyetSpa.Application.Common;

namespace NhuNguyetSpa.Application.UseCases.Notifications;

/// <summary>BR-NTF-06, pure: which appointments are due for a reminder now, and the key that sends each start time once.</summary>
public static class ReminderWindow
{
    public static string DedupKey(Guid appointmentId, DateOnly date, TimeOnly start) =>
        $"appointment_reminder:{appointmentId:D}:{date.ToString("yyyyMMdd", CultureInfo.InvariantCulture)}{start.ToString("HHmm", CultureInfo.InvariantCulture)}";

    /// <summary>The Vietnam dates the window (now, now + hours] touches.</summary>
    public static (DateOnly From, DateOnly To) Days(DateTime nowUtc, int hours) =>
        (SpaTime.Today(nowUtc), SpaTime.Today(nowUtc.AddHours(hours)));

    /// <summary>The visit starts after now and at most <paramref name="hours"/> later.</summary>
    public static bool IsDue(DateOnly date, TimeOnly start, DateTime nowUtc, int hours)
    {
        var startUtc = StartUtc(date, start);
        return startUtc > nowUtc && startUtc <= nowUtc.AddHours(hours);
    }

    /// <summary>Booked when the reminder time had already passed: the customer just booked, no reminder needed.</summary>
    public static bool BookedInsideWindow(DateTime createdAtUtc, DateTime startUtc, int hours) => createdAtUtc > startUtc.AddHours(-hours);

    public static DateTime StartUtc(DateOnly date, TimeOnly start) => SpaTime.ToUtc(date.ToDateTime(start));
}
