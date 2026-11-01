using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Treatments;

/// <summary>Filter of <c>GET /me/treatments</c>: <c>status</c> = a snake_case <see cref="TreatmentPlanStatus"/>.</summary>
public sealed record MyTreatmentListQuery(string? Status);

/// <summary><see cref="EarliestDate"/> is set only when the session is not booked yet.</summary>
public sealed record MyNextSessionDto(Guid Id, int SequenceNumber, string ServiceName, bool CanBook, DateOnly? EarliestDate);

/// <summary>UC-SPA-19 list row; <see cref="PackageStatus"/> is the effective status (BR-TRT-04).</summary>
public sealed record MyTreatmentListItemDto(
    Guid Id,
    Guid CustomerPackageId,
    string PackageName,
    string? ImageUrl,
    TreatmentPlanStatus Status,
    CustomerPackageStatus PackageStatus,
    DateTime? ExpiresAtUtc,
    int TotalSessions,
    int UsedSessions,
    int BookedSessions,
    StaffRefDto? PrimaryStaff,
    MyNextSessionDto? NextSession);

/// <summary>UC-SPA-19 detail. The plan's internal note is never part of it (BR-TRT-10, Q-39).</summary>
public sealed record MyTreatmentPlanDto(
    Guid Id,
    Guid CustomerPackageId,
    string PackageName,
    string? ImageUrl,
    TreatmentPlanStatus Status,
    CustomerPackageStatus PackageStatus,
    DateTime? ExpiresAtUtc,
    int TotalSessions,
    int UsedSessions,
    int BookedSessions,
    StaffRefDto? PrimaryStaff,
    MyNextSessionDto? NextSession,
    string? Goal,
    string? StatusReason,
    DateOnly? StartDate,
    DateOnly? ExpectedEndDate,
    DateOnly? ActualEndDate,
    DateTime PurchasedAtUtc,
    PurchaseOrderRefDto Order,
    IReadOnlyList<MyTreatmentSessionDto> Sessions);

/// <summary>
/// One session for the customer (BR-TRT-10). <see cref="Result"/> and <see cref="SkinProfile"/> are filled only by
/// <c>GET /me/treatments/{id}/sessions/{sessionId}</c>; <see cref="Result"/> only for a completed session.
/// </summary>
public sealed record MyTreatmentSessionDto(
    Guid Id,
    int SequenceNumber,
    Guid SpaServiceId,
    string ServiceName,
    int DurationMinutes,
    TreatmentSessionStatus Status,
    DateTime? CompletedAtUtc,
    bool CanBook,
    string? Reason,
    DateOnly? EarliestDate,
    SessionAppointmentDto? Appointment,
    string? Result,
    SkinProfileSummaryDto? SkinProfile);
