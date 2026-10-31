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

    /// <summary>
    /// WF-06 on a completed session: the first one starts the plan, the package's last one ends it. Dates are the visit's,
    /// not the day the staff member pressed "complete". A paused plan stays paused unless the package is now complete.
    /// </summary>
    public void RecordCompletedSession(DateOnly visitDate, bool packageCompleted)
    {
        if (Status == TreatmentPlanStatus.Cancelled)
            throw new InvalidOperationException("A cancelled treatment plan cannot record a completed session.");
        if (Status == TreatmentPlanStatus.NotStarted)
        {
            Status = TreatmentPlanStatus.InProgress;
            StartDate = visitDate;
        }

        if (!packageCompleted)
            return;
        StartDate ??= visitDate;
        Status = TreatmentPlanStatus.Completed;
        ActualEndDate = visitDate;
    }
}
