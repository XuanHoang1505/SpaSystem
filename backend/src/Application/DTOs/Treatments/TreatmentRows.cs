using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Treatments;

/// <summary>A treatment plan with its package and customer, as stored; services turn it into the customer or management DTOs.</summary>
public sealed record TreatmentPlanRow(
    Guid Id,
    Guid CustomerPackageId,
    string PackageName,
    string? ImageUrl,
    TreatmentPlanStatus Status,
    string? StatusReason,
    string? Goal,
    string? Note,
    DateOnly? StartDate,
    DateOnly? ExpectedEndDate,
    DateOnly? ActualEndDate,
    StaffRefDto? PrimaryStaff,
    CustomerPackageStatus PackageStatus,
    DateTime? ExpiresAtUtc,
    DateTime PurchasedAtUtc,
    int TotalSessions,
    int UsedSessions,
    int BookedSessions,
    TreatmentCustomerDto Customer,
    PurchaseOrderRefDto Order);

public sealed record TreatmentSessionRow(
    Guid Id,
    Guid TreatmentPlanId,
    Guid SpaServiceId,
    int SequenceNumber,
    string ServiceName,
    int DurationMinutes,
    TreatmentSessionStatus Status,
    string? Note,
    DateTime? CompletedAtUtc);

/// <summary>An appointment booked with a session of the plan (never <c>cancelled</c> or <c>hold_expired</c>).</summary>
public sealed record SessionVisitRow(
    Guid AppointmentId,
    Guid TreatmentSessionId,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    AppointmentStatus Status,
    StaffRefDto Staff,
    Guid? SkinProfileId);
