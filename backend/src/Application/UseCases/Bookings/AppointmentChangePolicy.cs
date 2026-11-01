using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.UseCases.Purchases;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>
/// BR-BKG-07 (docs/specs/bookings.md, Q-04): a customer reschedules or cancels a pending or confirmed appointment only up to
/// <c>Booking:CustomerChangeCutoffHours</c> before its current start (VN time). Pure, so the commands and the
/// <c>canReschedule</c>/<c>canCancel</c> flags give the same answer.
/// </summary>
public static class AppointmentChangePolicy
{
    /// <summary>The last moment (UTC) the customer may change the appointment; null when its status never allows it.</summary>
    public static DateTime? DeadlineUtc(AppointmentStatus status, DateOnly date, TimeOnly start, int cutoffHours) =>
        IsChangeable(status) ? SpaTime.ToUtc(date.ToDateTime(start).AddHours(-cutoffHours)) : null;

    public static bool CanChange(AppointmentStatus status, DateOnly date, TimeOnly start, DateTime nowUtc, int cutoffHours) =>
        IsChangeable(status) && WithinWindow(date, start, nowUtc, cutoffHours);

    /// <summary>Status first (409 <c>appointment_status_invalid</c>), then the cutoff (400 <c>change_window_passed</c>).</summary>
    public static void EnsureCanChange(AppointmentStatus status, DateOnly date, TimeOnly start, DateTime nowUtc, int cutoffHours)
    {
        if (!IsChangeable(status))
            throw BookingErrors.StatusInvalid(status);
        if (!WithinWindow(date, start, nowUtc, cutoffHours))
            throw BookingErrors.ChangeWindowPassed(cutoffHours);
    }

    /// <summary>
    /// Whatever the appointment was booked with still allows moving it (BR-BKG-16): the plan is not paused or cancelled, the package
    /// is still active, a bought service has not expired. Cancelling does not ask this.
    /// </summary>
    public static bool SourceAllowsReschedule(AppointmentChangeFacts facts, DateTime nowUtc)
    {
        ArgumentNullException.ThrowIfNull(facts);
        if (facts.PlanStatus is TreatmentPlanStatus.Paused or TreatmentPlanStatus.Cancelled)
            return false;
        if (facts.PackageStatus is { } package && PurchaseStatus.Effective(package, facts.PackageExpiresAtUtc, nowUtc) != CustomerPackageStatus.Active)
            return false;
        return facts.EntitlementExpiresAtUtc is not { } expires || expires > nowUtc;
    }

    private static bool IsChangeable(AppointmentStatus status) =>
        status is AppointmentStatus.PendingConfirmation or AppointmentStatus.Confirmed;

    private static bool WithinWindow(DateOnly date, TimeOnly start, DateTime nowUtc, int cutoffHours)
    {
        var startsAt = date.ToDateTime(start);
        var now = SpaTime.ToLocal(nowUtc);
        return now <= startsAt.AddHours(-cutoffHours) && now < startsAt;
    }
}
