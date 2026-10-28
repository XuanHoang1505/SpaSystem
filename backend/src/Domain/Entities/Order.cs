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
    public Guid? IdempotencyKey { get; set; }
    public ICollection<OrderItem> Items { get; } = [];
    public ICollection<Payment> Payments { get; } = [];

    /// <summary>
    /// A valid successful payment result: from pending, or from expired when the result arrived after OrderExpiryJob
    /// (VNPay only accepts money before the due time, so the customer paid in time; Q-20).
    /// </summary>
    public void MarkPaid()
    {
        if (Status is not (OrderStatus.PendingPayment or OrderStatus.Expired))
            throw new InvalidOperationException($"Order {Code} cannot be paid in status {Status}.");
        Status = OrderStatus.Paid;
    }

    public void Expire()
    {
        if (Status != OrderStatus.PendingPayment)
            throw new InvalidOperationException($"Order {Code} cannot expire in status {Status}.");
        Status = OrderStatus.Expired;
    }

    public bool AcceptsPaymentAttempt(DateTime nowUtc) => Status == OrderStatus.PendingPayment && nowUtc < PaymentDueAtUtc;
}
