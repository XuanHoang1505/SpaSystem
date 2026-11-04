using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Treatments;

/// <summary>
/// Filters of <c>GET /treatments</c> (paging and the customer name/phone <c>search</c> come from <c>PagedQuery</c>);
/// <see cref="Status"/> is a snake_case <see cref="TreatmentPlanStatus"/>.
/// </summary>
public sealed class TreatmentListQuery
{
    public Guid? CustomerId { get; set; }
    public string? Status { get; set; }
    public Guid? PrimaryStaffMemberId { get; set; }
}

/// <summary><see cref="ScopeStaffMemberId"/> null = owner (every plan); otherwise BR-TRT-06 for that staff member.</summary>
public sealed record TreatmentSearchCriteria(
    string? Search,
    Guid? CustomerId,
    TreatmentPlanStatus? Status,
    Guid? PrimaryStaffMemberId,
    Guid? ScopeStaffMemberId,
    bool IncludeAssigned,
    int PageNumber,
    int PageSize);

/// <summary>The lowest session still to do (not booked or booked) and its current appointment.</summary>
public sealed record TreatmentNextSessionDto(Guid Id, int SequenceNumber, string ServiceName, TreatmentSessionStatus Status, SessionAppointmentDto? Appointment);

/// <summary>UC-SPA-21 list row; <see cref="PackageStatus"/> is the effective status (BR-TRT-04).</summary>
public sealed record TreatmentPlanListItemDto(
    Guid Id,
    TreatmentCustomerDto Customer,
    string PackageName,
    TreatmentPlanStatus Status,
    CustomerPackageStatus PackageStatus,
    DateTime? ExpiresAtUtc,
    int TotalSessions,
    int UsedSessions,
    int BookedSessions,
    StaffRefDto? PrimaryStaff,
    TreatmentNextSessionDto? NextSession,
    DateTime PurchasedAtUtc);

public sealed record TreatmentSessionDto(
    Guid Id,
    int SequenceNumber,
    Guid SpaServiceId,
    string ServiceName,
    int DurationMinutes,
    TreatmentSessionStatus Status,
    string? Note,
    DateTime? CompletedAtUtc,
    SessionAppointmentDto? Appointment);

public sealed record TreatmentSkinProfileDto(
    Guid Id,
    Guid AppointmentId,
    int SequenceNumber,
    DateTime AssessedAtUtc,
    SkinType SkinType,
    string? MainConcerns,
    string? CareGoals,
    string? RecommendedTreatment,
    StaffRefDto AssessedBy);

/// <summary>A completed or no-show visit of the plan; <see cref="Result"/> is the session note, null for a no-show.</summary>
public sealed record CareHistoryEntryDto(
    Guid AppointmentId,
    int SequenceNumber,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    AppointmentStatus Status,
    StaffRefDto Staff,
    string? Result,
    Guid? SkinProfileId);

/// <summary>UC-SPA-21 detail. <see cref="CanEdit"/>: BR-TRT-06; <see cref="CanManage"/>: the caller is the owner (status and staff commands).</summary>
public sealed record TreatmentPlanDto(
    Guid Id,
    TreatmentCustomerDto Customer,
    string PackageName,
    TreatmentPlanStatus Status,
    CustomerPackageStatus PackageStatus,
    DateTime? ExpiresAtUtc,
    int TotalSessions,
    int UsedSessions,
    int BookedSessions,
    StaffRefDto? PrimaryStaff,
    TreatmentNextSessionDto? NextSession,
    DateTime PurchasedAtUtc,
    Guid CustomerPackageId,
    string? Goal,
    string? Note,
    string? StatusReason,
    DateOnly? StartDate,
    DateOnly? ExpectedEndDate,
    DateOnly? ActualEndDate,
    bool CanEdit,
    bool CanManage,
    bool HasAllergies,
    IReadOnlyList<TreatmentSessionDto> Sessions,
    IReadOnlyList<TreatmentSkinProfileDto> SkinProfiles,
    IReadOnlyList<CareHistoryEntryDto> CareHistory);
