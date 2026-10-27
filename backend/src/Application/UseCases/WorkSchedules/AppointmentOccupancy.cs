using System.Linq.Expressions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.WorkSchedules;

/// <summary>
/// BR-STF-07, the one definition of an appointment that occupies a staff member's time (same statuses as the
/// appointments EXCLUDE constraint, with held slots counting only until the hold expires). Booking (UC-SPA-15/17) reuses it.
/// </summary>
public static class AppointmentOccupancy
{
    public static Expression<Func<Appointment, bool>> IsOccupying(DateTime nowUtc) => appointment =>
        appointment.Status == AppointmentStatus.PendingConfirmation
        || appointment.Status == AppointmentStatus.Confirmed
        || (appointment.Status == AppointmentStatus.Held && appointment.HoldExpiresAtUtc > nowUtc);

    /// <summary>Half-open intervals [start, end): touching intervals do not overlap.</summary>
    public static bool Overlaps(TimeOnly aStart, TimeOnly aEnd, TimeOnly bStart, TimeOnly bEnd) => aStart < bEnd && bStart < aEnd;
}
