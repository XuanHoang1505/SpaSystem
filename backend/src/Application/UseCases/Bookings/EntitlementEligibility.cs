using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.UseCases.Purchases;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>
/// Who may book with what (docs/specs/bookings.md BR-BKG-05, BR-BKG-15, Q-30). Pure, so the purchases list (UC-SPA-18 canBook) and
/// the booking commands (UC-SPA-15) give the same answer.
/// </summary>
public static class EntitlementEligibility
{
    /// <summary>Null when the bought single service can be booked; otherwise the reason shown to the customer.</summary>
    public static string? ForService(EntitlementStatus status, DateTime? expiresAtUtc, DateTime nowUtc) =>
        PurchaseStatus.Effective(status, expiresAtUtc, nowUtc) switch
        {
            EntitlementStatus.Available => null,
            EntitlementStatus.Booked => "Dịch vụ này đã được đặt lịch.",
            EntitlementStatus.Used => "Dịch vụ này đã được sử dụng.",
            _ => "Dịch vụ đã hết hạn sử dụng.",
        };

    public static SessionEligibility ForSession(SessionBookingFacts facts, DateTime nowUtc)
    {
        ArgumentNullException.ThrowIfNull(facts);
        var today = SpaTime.Today(nowUtc);
        var earliest = facts.Previous is { } previous ? previous.Date.AddDays(facts.MinDaysBetweenSessions) : today;
        if (earliest < today)
            earliest = today;
        var reason = SessionReason(facts, nowUtc);
        return new SessionEligibility(reason is null, reason, earliest);
    }

    /// <summary>Throws the coded error when the session cannot be booked at <paramref name="date"/> <paramref name="start"/> (VN).</summary>
    public static void EnsureSessionSlot(SessionBookingFacts facts, DateOnly date, TimeOnly start, DateTime nowUtc)
    {
        var eligibility = ForSession(facts, nowUtc);
        if (!eligibility.CanBook)
            throw BookingErrors.EntitlementNotEligible(eligibility.Reason!);
        if (date < eligibility.EarliestDate || (facts.Previous is { } previous && date == previous.Date && start < previous.EndTime))
            throw BookingErrors.SessionTooEarly(date < eligibility.EarliestDate ? eligibility.EarliestDate : date);
        // Q-30: the visit itself must start before the package expires.
        if (facts.PackageExpiresAtUtc is { } expires && date.ToDateTime(start) >= SpaTime.ToLocal(expires))
            throw BookingErrors.EntitlementNotEligible("Ngày hẹn phải trước hạn sử dụng của gói.");
    }

    /// <summary>BR-BKG-16: earliest date after the previous session's visit, latest date before the next session's visit.</summary>
    public static SessionWindow RescheduleWindow(SessionBookingFacts facts, DateTime nowUtc)
    {
        ArgumentNullException.ThrowIfNull(facts);
        var latest = facts.Next is { } next ? next.Date.AddDays(-next.MinDaysBetweenSessions) : (DateOnly?)null;
        return new SessionWindow(ForSession(facts, nowUtc).EarliestDate, latest);
    }

    /// <summary>
    /// UC-SPA-16 A1 for a package session (BR-BKG-16, Q-42): the session is already booked by the appointment being moved, so only the
    /// package, the plan, the order with the previous and next sessions and the package expiry (Q-30) are checked.
    /// </summary>
    public static void EnsureSessionReschedule(SessionBookingFacts facts, DateOnly date, TimeOnly start, TimeOnly end, DateTime nowUtc)
    {
        ArgumentNullException.ThrowIfNull(facts);
        if (PurchaseStatus.Effective(facts.PackageStatus, facts.PackageExpiresAtUtc, nowUtc) != CustomerPackageStatus.Active)
            throw BookingErrors.EntitlementNotEligible("Gói đã hết hạn hoặc không còn sử dụng.");
        if (facts.PlanStatus is TreatmentPlanStatus.Paused or TreatmentPlanStatus.Cancelled)
            throw BookingErrors.EntitlementNotEligible("Liệu trình đang tạm dừng hoặc đã hủy.");
        var window = RescheduleWindow(facts, nowUtc);
        if (date < window.Earliest || (facts.Previous is { } previous && date == previous.Date && start < previous.EndTime))
            throw BookingErrors.SessionTooEarly(date < window.Earliest ? window.Earliest : date);
        if (window.Latest is { } latest && (date > latest || (date == facts.Next!.Date && end > facts.Next.StartTime)))
            throw BookingErrors.SessionTooLate(date > latest ? latest : date);
        if (facts.PackageExpiresAtUtc is { } expires && date.ToDateTime(start) >= SpaTime.ToLocal(expires))
            throw BookingErrors.EntitlementNotEligible("Ngày hẹn phải trước hạn sử dụng của gói.");
    }

    /// <summary>BR-BKG-15: a book-now visit may not start before its hold (still waiting for payment) runs out.</summary>
    public static void EnsureBookNowStart(DateOnly date, TimeOnly start, DateTime holdExpiresAtUtc)
    {
        if (date.ToDateTime(start) < SpaTime.ToLocal(holdExpiresAtUtc))
            throw BookingErrors.SlotTooSoon();
    }

    private static string? SessionReason(SessionBookingFacts facts, DateTime nowUtc)
    {
        if (facts.Status != TreatmentSessionStatus.NotBooked)
            return "Buổi này đã được đặt lịch hoặc đã hoàn thành.";
        if (PurchaseStatus.Effective(facts.PackageStatus, facts.PackageExpiresAtUtc, nowUtc) != CustomerPackageStatus.Active)
            return "Gói đã hết hạn hoặc không còn sử dụng.";
        if (facts.PlanStatus is TreatmentPlanStatus.Paused or TreatmentPlanStatus.Cancelled)
            return "Liệu trình đang tạm dừng hoặc đã hủy.";
        if (!facts.EarlierSessionsDone)
            return "Cần đặt lịch các buổi trước theo thứ tự.";
        return null;
    }
}
