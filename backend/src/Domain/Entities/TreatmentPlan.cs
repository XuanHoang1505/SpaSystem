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

    /// <summary>Why the owner paused or cancelled the plan (BR-TRT-08); cleared on resume and close.</summary>
    public string? StatusReason { get; set; }

    public string? Note { get; set; }
    public ICollection<TreatmentSession> Sessions { get; } = [];

    private bool IsClosed => Status is TreatmentPlanStatus.Completed or TreatmentPlanStatus.Cancelled;

    /// <summary>BR-TRT-07: goal, expected end date and note; a completed or cancelled plan is read only.</summary>
    public void UpdateDetails(string? goal, DateOnly? expectedEndDate, string? note)
    {
        EnsureOpen();
        Goal = goal;
        ExpectedEndDate = expectedEndDate;
        Note = note;
    }

    /// <summary>BR-TRT-07 (owner): null removes the primary staff member.</summary>
    public void AssignPrimaryStaff(Guid? staffMemberId)
    {
        EnsureOpen();
        PrimaryStaffMemberId = staffMemberId;
    }

    /// <summary>BR-TRT-08: booked visits stay; new bookings are blocked while paused (BR-TRT-05).</summary>
    public void Pause(string reason)
    {
        if (Status is not (TreatmentPlanStatus.NotStarted or TreatmentPlanStatus.InProgress))
            throw InvalidTransition("paused");
        Status = TreatmentPlanStatus.Paused;
        StatusReason = reason;
    }

    public void Resume(int usedSessions)
    {
        if (Status != TreatmentPlanStatus.Paused)
            throw InvalidTransition("resumed");
        Status = usedSessions > 0 ? TreatmentPlanStatus.InProgress : TreatmentPlanStatus.NotStarted;
        StatusReason = null;
    }

    /// <summary>BR-TRT-08: the caller checks that no session is still booked and cancels the package too.</summary>
    public void Cancel(string reason)
    {
        if (IsClosed)
            throw InvalidTransition("cancelled");
        Status = TreatmentPlanStatus.Cancelled;
        StatusReason = reason;
    }

    /// <summary>BR-TRT-08 (CARE-LATER-03): the owner ends a plan whose remaining sessions were skipped.</summary>
    public void Close(DateOnly actualEndDate)
    {
        if (Status is not (TreatmentPlanStatus.InProgress or TreatmentPlanStatus.Paused))
            throw InvalidTransition("closed");
        Status = TreatmentPlanStatus.Completed;
        ActualEndDate = actualEndDate;
        StatusReason = null;
    }

    private void EnsureOpen()
    {
        if (IsClosed)
            throw new InvalidOperationException($"Treatment plan in status {Status} cannot be changed.");
    }

    private InvalidOperationException InvalidTransition(string action) =>
        new($"Treatment plan in status {Status} cannot be {action}.");

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
