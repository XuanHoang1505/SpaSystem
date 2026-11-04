using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>BR-BKG-17: which statuses each tab of the customer's list holds, and its query-string text.</summary>
public static class MyAppointmentScopes
{
    /// <summary>One case-insensitive name only (no numbers, no comma lists); null or blank parses to null (every status).</summary>
    public static bool TryParse(string? text, out MyAppointmentScope? scope)
    {
        scope = null;
        if (string.IsNullOrWhiteSpace(text))
            return true;
        if (int.TryParse(text, out _) || text.Contains(',', StringComparison.Ordinal) ||
            !Enum.TryParse<MyAppointmentScope>(text, ignoreCase: true, out var value))
            return false;
        scope = value;
        return true;
    }

    public static IReadOnlyList<AppointmentStatus> StatusesOf(MyAppointmentScope scope) => scope switch
    {
        MyAppointmentScope.Upcoming => [AppointmentStatus.Held, AppointmentStatus.PendingConfirmation, AppointmentStatus.Confirmed],
        MyAppointmentScope.Past => [AppointmentStatus.Completed, AppointmentStatus.NoShow],
        _ => [AppointmentStatus.Cancelled, AppointmentStatus.HoldExpired],
    };
}
