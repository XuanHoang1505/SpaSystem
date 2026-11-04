using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Purchases;

/// <summary>A bought single service as stored; the service turns it into <see cref="PurchasedServiceDto"/> (effective status, canBook).</summary>
public sealed record PurchasedServiceRow(
    Guid Id,
    Guid SpaServiceId,
    string ServiceName,
    string? ImageUrl,
    int DurationMinutes,
    EntitlementStatus Status,
    DateTime? ExpiresAtUtc,
    DateTime PurchasedAtUtc,
    PurchaseAppointmentDto? Appointment,
    PurchaseOrderRefDto Order);

/// <summary>A bought package as stored, with the facts of its lowest not-booked session (BR-TRT-05).</summary>
public sealed record PurchasedPackageRow(
    Guid Id,
    Guid ServicePackageId,
    string PackageName,
    string? ImageUrl,
    CustomerPackageStatus Status,
    DateTime PurchasedAtUtc,
    DateTime? ActivatedAtUtc,
    DateTime? ExpiresAtUtc,
    int TotalSessions,
    int UsedSessions,
    int BookedSessions,
    Guid TreatmentPlanId,
    TreatmentPlanStatus TreatmentPlanStatus,
    SessionBookingFacts? NextSession,
    string? NextSessionServiceName,
    IReadOnlyList<PackageItemProgressDto>? Items,
    PurchaseOrderRefDto Order);
