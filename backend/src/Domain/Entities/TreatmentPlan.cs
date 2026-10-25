using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>treatment_plans</c> (thesis: LieuTrinh). See docs/domain/data-model.md.</summary>
public sealed class TreatmentPlan : BaseEntity
{
    public Guid CustomerPackageId { get; set; }
    public CustomerPackage CustomerPackage { get; set; } = null!;
    public Guid? PrimaryStaffMemberId { get; set; }
    public StaffMember? PrimaryStaffMember { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? ExpectedEndDate { get; set; }
    public DateOnly? ActualEndDate { get; set; }
    public string? Goal { get; set; }
    public TreatmentPlanStatus Status { get; set; }
    public string? Note { get; set; }
    public ICollection<TreatmentSession> Sessions { get; } = [];
}
