using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>customer_packages</c> (thesis: GoiKhachHang). See docs/domain/data-model.md.</summary>
public sealed class CustomerPackage : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public Guid OrderItemId { get; set; }
    public OrderItem OrderItem { get; set; } = null!;
    public string PackageName { get; set; } = string.Empty;
    public DateTime PurchasedAtUtc { get; set; }
    public DateTime? ActivatedAtUtc { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public int TotalSessions { get; set; }
    public int UsedSessions { get; set; }
    public CustomerPackageStatus Status { get; set; }
}
