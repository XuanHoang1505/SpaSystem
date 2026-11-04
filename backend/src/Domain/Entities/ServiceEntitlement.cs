using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>service_entitlements</c> (thesis: DichVuKhachHang). See docs/domain/data-model.md.</summary>
public sealed class ServiceEntitlement : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public Guid OrderItemId { get; set; }
    public OrderItem OrderItem { get; set; } = null!;
    public DateTime? ExpiresAtUtc { get; set; }
    public EntitlementStatus Status { get; set; }

    /// <summary>Booking with a bought service (UC-SPA-15 flow 2, BR-TRT-02).</summary>
    public void Book()
    {
        if (Status != EntitlementStatus.Available)
            throw new InvalidOperationException($"Entitlement in status {Status} cannot be booked.");
        Status = EntitlementStatus.Booked;
    }

    /// <summary>A cancelled (or not-counted no-show) booking gives the entitlement back (BR-BKG-10).</summary>
    public void Release()
    {
        if (Status == EntitlementStatus.Booked)
            Status = EntitlementStatus.Available;
    }

    /// <summary>The visit booked with this entitlement was completed (UC-SPA-28, BR-TRT-02).</summary>
    public void MarkUsed()
    {
        if (Status != EntitlementStatus.Booked)
            throw new InvalidOperationException($"Entitlement in status {Status} cannot be used.");
        Status = EntitlementStatus.Used;
    }

    /// <summary>A no-show that counts as a visit (Q-07 switched on).</summary>
    public void Consume()
    {
        if (Status == EntitlementStatus.Booked)
            Status = EntitlementStatus.Used;
    }
}
