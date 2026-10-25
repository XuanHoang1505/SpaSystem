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
}
