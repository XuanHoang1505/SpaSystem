using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Care;

/// <summary>Pure checks of docs/specs/care.md: when a skin profile may be written (BR-CARE-04) and a visit completed (BR-CARE-03).</summary>
public static class CareRules
{
    /// <summary>
    /// A confirmed appointment from its day on, or a completed one up to <paramref name="windowDays"/> days after its date
    /// (Q-34); every other status is <c>appointment_status_invalid</c>.
    /// </summary>
    public static void EnsureSkinProfileWritable(AppointmentStatus status, DateOnly date, DateOnly today, int windowDays)
    {
        switch (status)
        {
            case AppointmentStatus.Confirmed when date > today:
                throw CareErrors.SkinProfileTooEarly();
            case AppointmentStatus.Confirmed:
                return;
            case AppointmentStatus.Completed when today > date.AddDays(windowDays):
                throw CareErrors.SkinProfileLocked(windowDays);
            case AppointmentStatus.Completed:
                return;
            default:
                throw BookingErrors.StatusInvalid(status);
        }
    }

    /// <summary>The appointment is confirmed and its start (Vietnam time) has been reached; there is no upper limit.</summary>
    public static void EnsureCompletable(AppointmentStatus status, DateOnly date, TimeOnly start, DateTime nowUtc)
    {
        if (status != AppointmentStatus.Confirmed)
            throw BookingErrors.StatusInvalid(status);
        if (SpaTime.ToLocal(nowUtc) < date.ToDateTime(start))
            throw CareErrors.CompleteTooEarly();
    }
}
