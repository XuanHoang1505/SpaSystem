using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>The latest visit of the session just before the one being booked (occupying, completed or no-show appointment).</summary>
public sealed record PreviousVisit(DateOnly Date, TimeOnly EndTime);

/// <summary>
/// Everything BR-BKG-05 needs to decide whether a package session can be booked. <paramref name="EarlierSessionsDone"/>: every lower
/// sequence number is booked, completed or skipped. <paramref name="MinDaysBetweenSessions"/> comes from the package's current
/// configuration for the session's service (0 when that line is gone).
/// </summary>
public sealed record SessionBookingFacts(
    Guid SessionId,
    Guid SpaServiceId,
    int DurationMinutes,
    int SequenceNumber,
    TreatmentSessionStatus Status,
    CustomerPackageStatus PackageStatus,
    DateTime? PackageExpiresAtUtc,
    TreatmentPlanStatus PlanStatus,
    bool EarlierSessionsDone,
    PreviousVisit? Previous,
    int MinDaysBetweenSessions);

/// <summary><see cref="EarliestDate"/> is never before today.</summary>
public sealed record SessionEligibility(bool CanBook, string? Reason, DateOnly EarliestDate);
