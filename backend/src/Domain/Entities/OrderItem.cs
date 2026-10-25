using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>order_items</c> (thesis: ChiTietDonHang). See docs/domain/data-model.md.</summary>
public sealed class OrderItem : BaseEntity
{
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public Guid? SpaServiceId { get; set; }
    public SpaService? SpaService { get; set; }
    public Guid? ServicePackageId { get; set; }
    public ServicePackage? ServicePackage { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal LineTotal { get; set; }
    public string? Note { get; set; }
}
