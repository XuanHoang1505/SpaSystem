using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>orders</c> (thesis: DonHang). See docs/domain/data-model.md.</summary>
public sealed class Order : BaseAuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public decimal Subtotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal GrandTotal { get; set; }
    public OrderStatus Status { get; set; }
    public string? Note { get; set; }
    public DateTime PaymentDueAtUtc { get; set; }
    public ICollection<OrderItem> Items { get; } = [];
    public ICollection<Payment> Payments { get; } = [];
}
