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
}
