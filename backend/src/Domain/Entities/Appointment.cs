using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>appointments</c> (thesis: LichHen). See docs/domain/data-model.md.</summary>
public sealed class Appointment : BaseEntity, IHasCreatedAt
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public Guid StaffMemberId { get; set; }
    public StaffMember StaffMember { get; set; } = null!;
    public Guid? ServiceEntitlementId { get; set; }
    public ServiceEntitlement? ServiceEntitlement { get; set; }
    public Guid? TreatmentSessionId { get; set; }
    public TreatmentSession? TreatmentSession { get; set; }
    public Guid? OrderItemId { get; set; }
    public OrderItem? OrderItem { get; set; }
    public DateTime? HoldExpiresAtUtc { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public AppointmentStatus Status { get; set; }
    public DateTime? CancelledAtUtc { get; set; }
    public string? CancellationReason { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    /// <summary>The owner may reschedule, reassign or cancel only these (BR-BKG-09); held slots belong to the payment flow.</summary>
    public bool CanBeManaged => Status is AppointmentStatus.PendingConfirmation or AppointmentStatus.Confirmed;

    public void Confirm()
    {
        EnsureStatus(Status == AppointmentStatus.PendingConfirmation);
        Status = AppointmentStatus.Confirmed;
    }

    public void Reschedule(DateOnly date, TimeOnly start, TimeOnly end)
    {
        EnsureStatus(CanBeManaged);
        if (end <= start)
            throw new ArgumentException("End time must be after start time.", nameof(end));
        Date = date;
        StartTime = start;
        EndTime = end;
    }

    public void AssignStaff(Guid staffMemberId)
    {
        EnsureStatus(CanBeManaged);
        StaffMemberId = staffMemberId;
    }

    public void Cancel(string reason, DateTime nowUtc)
    {
        EnsureStatus(CanBeManaged);
        Status = AppointmentStatus.Cancelled;
        CancellationReason = reason;
        CancelledAtUtc = nowUtc;
    }

    /// <summary>BR-BKG-08; the owner's remark is appended so the note written at booking is kept.</summary>
    public void MarkNoShow(string? note)
    {
        EnsureStatus(Status == AppointmentStatus.Confirmed);
        Status = AppointmentStatus.NoShow;
        if (note is not null)
            Note = string.IsNullOrEmpty(Note) ? note : $"{Note}\n{note}";
    }

    /// <summary>BR-BKG-06: a book-now hold paid successfully becomes confirmed with the entitlement the payment created.</summary>
    public void ConfirmPaidHold(Guid serviceEntitlementId)
    {
        EnsureStatus(Status == AppointmentStatus.Held);
        ServiceEntitlementId = serviceEntitlementId;
        Status = AppointmentStatus.Confirmed;
    }

    public void ExpireHold()
    {
        EnsureStatus(Status == AppointmentStatus.Held);
        Status = AppointmentStatus.HoldExpired;
    }

    private void EnsureStatus(bool allowed)
    {
        if (!allowed)
            throw new InvalidOperationException($"Appointment in status {Status} cannot make this transition.");
    }
}
