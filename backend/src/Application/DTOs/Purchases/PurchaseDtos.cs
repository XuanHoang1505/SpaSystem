using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Purchases;

/// <summary><c>GET /me/purchases</c> (UC-SPA-18): both lists, newest first; a <c>type</c> filter leaves the other list empty.</summary>
public sealed record PurchasesDto(IReadOnlyList<PurchasedServiceDto> Services, IReadOnlyList<PurchasedPackageDto> Packages);

public sealed record PurchasedServiceDto(
    Guid Id,
    Guid SpaServiceId,
    string ServiceName,
    string? ImageUrl,
    int DurationMinutes,
    EntitlementStatus Status,
    DateTime? ExpiresAtUtc,
    DateTime PurchasedAtUtc,
    bool CanBook,
    PurchaseAppointmentDto? Appointment,
    PurchaseOrderRefDto Order);

/// <summary><see cref="Items"/> is filled only by the detail endpoint.</summary>
public sealed record PurchasedPackageDto(
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
    PurchaseTreatmentPlanDto TreatmentPlan,
    NextSessionDto? NextSession,
    IReadOnlyList<PackageItemProgressDto>? Items,
    PurchaseOrderRefDto Order);

public sealed record PurchaseTreatmentPlanDto(Guid Id, TreatmentPlanStatus Status);

/// <summary>BR-TRT-05: the session to book next and the earliest date it may be booked for.</summary>
public sealed record NextSessionDto(Guid Id, int SequenceNumber, Guid SpaServiceId, string ServiceName, int DurationMinutes, bool CanBook, DateOnly EarliestDate);

public sealed record PackageItemProgressDto(Guid SpaServiceId, string ServiceName, int TotalSessions, int CompletedSessions, int BookedSessions);

public sealed record PurchaseOrderRefDto(Guid Id, string Code);

public sealed record PurchaseAppointmentDto(Guid Id, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, AppointmentStatus Status);

/// <summary>Filters of <c>GET /me/purchases</c>: <c>type</c> = service | package; <c>status</c> needs <c>type</c>.</summary>
public sealed record PurchaseListQuery(string? Type, string? Status);
