using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>The latest visit of the session just before the one being booked (occupying, completed or no-show appointment).</summary>
public sealed record PreviousVisit(DateOnly Date, TimeOnly EndTime);

/// <summary>
/// The earliest visit of the session just after this one (occupying, completed or no-show appointment), with the gap the package
/// asks before that session's service (BR-BKG-16, Q-42).
/// </summary>
public sealed record NextVisit(DateOnly Date, TimeOnly StartTime, int MinDaysBetweenSessions);

/// <summary>
/// Everything BR-BKG-05 needs to decide whether a package session can be booked. <paramref name="EarlierSessionsDone"/>: every lower
/// sequence number is booked, completed or skipped. <paramref name="MinDaysBetweenSessions"/> comes from the package's current
/// configuration for the session's service (0 when that line is gone). <paramref name="Next"/> is set when the next session already
/// has a visit (needed only when an existing appointment is moved).
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
    int MinDaysBetweenSessions,
    NextVisit? Next = null);

/// <summary><see cref="EarliestDate"/> is never before today.</summary>
public sealed record SessionEligibility(bool CanBook, string? Reason, DateOnly EarliestDate);

/// <summary>Dates a booked session may move to (BR-BKG-16); <see cref="Latest"/> is null when the next session has no visit yet.</summary>
public sealed record SessionWindow(DateOnly Earliest, DateOnly? Latest);
