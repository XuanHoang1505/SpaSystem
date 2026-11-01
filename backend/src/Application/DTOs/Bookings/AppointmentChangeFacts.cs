using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>
/// What decides whether a customer may reschedule or cancel their appointment (BR-BKG-07): its status and time, plus the state of
/// the package/plan (session appointments) or entitlement it was booked with. Fields of the other source are null.
/// </summary>
public sealed record AppointmentChangeFacts(
    AppointmentStatus Status,
    DateOnly Date,
    TimeOnly StartTime,
    TreatmentPlanStatus? PlanStatus,
    CustomerPackageStatus? PackageStatus,
    DateTime? PackageExpiresAtUtc,
    DateTime? EntitlementExpiresAtUtc);
