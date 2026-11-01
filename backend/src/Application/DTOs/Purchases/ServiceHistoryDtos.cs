using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Purchases;

/// <summary>
/// Filters of <c>GET /me/service-history</c> (paging comes from <c>PagedQuery</c>); dates are inclusive and optional,
/// <see cref="Status"/> is <c>completed</c> or <c>no_show</c> (Q-40).
/// </summary>
public sealed class ServiceHistoryQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public Guid? SpaServiceId { get; set; }
    public string? Status { get; set; }
}

public sealed record ServiceHistoryCriteria(
    DateOnly? FromDate, DateOnly? ToDate, Guid? SpaServiceId, AppointmentStatus? Status, int PageNumber, int PageSize);

/// <summary>One past visit (UC-SPA-20). <see cref="Source"/> is <c>service</c> (single service) or <c>package</c>.</summary>
public sealed record ServiceHistoryItemDto(
    Guid AppointmentId,
    AppointmentStatus Status,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    Guid SpaServiceId,
    string ServiceName,
    StaffRefDto Staff,
    string Source,
    Guid? TreatmentPlanId,
    string? PackageName,
    int? SequenceNumber);

/// <summary><see cref="Result"/> is the care result written at completion; null for a no-show (BR-TRT-11).</summary>
public sealed record ServiceHistoryDetailDto(
    Guid AppointmentId,
    AppointmentStatus Status,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    Guid SpaServiceId,
    string ServiceName,
    StaffRefDto Staff,
    string Source,
    Guid? TreatmentPlanId,
    string? PackageName,
    int? SequenceNumber,
    int DurationMinutes,
    string? Result,
    DateTime? CompletedAtUtc,
    Guid? ServiceEntitlementId,
    Guid? TreatmentSessionId,
    PurchaseOrderRefDto? Order);
