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

    /// <summary><c>Installment</c>: the order is paid in <see cref="Installments"/> (Q-85, docs/specs/order-installments.md).</summary>
    public PaymentPlan PaymentPlan { get; set; }
    public string? Note { get; set; }
    public DateTime PaymentDueAtUtc { get; set; }
    public Guid? IdempotencyKey { get; set; }
    public DateTime? CancelledAtUtc { get; set; }
    public string? CancellationReason { get; set; }
    public ICollection<OrderItem> Items { get; } = [];
    public ICollection<Payment> Payments { get; } = [];
    public ICollection<OrderInstallment> Installments { get; } = [];

    public bool IsInstallmentPlan => PaymentPlan == PaymentPlan.Installment;

    /// <summary>The installment the next payment is for: the lowest pending one (BR-INS-05). Null when none is left.</summary>
    public OrderInstallment? NextPendingInstallment => Installments
        .Where(installment => installment.Status == InstallmentStatus.Pending)
        .OrderBy(installment => installment.SequenceNumber)
        .FirstOrDefault();

    /// <summary>Sessions 1..this number are paid and bookable (BR-INS-06); 0 before the first installment is paid.</summary>
    public int PaidSessionCount => Installments
        .Where(installment => installment.Status == InstallmentStatus.Paid)
        .Select(installment => installment.LastSessionNumber)
        .DefaultIfEmpty(0)
        .Max();

    public decimal PaidAmount => IsInstallmentPlan
        ? Installments.Where(installment => installment.Status == InstallmentStatus.Paid).Sum(installment => installment.Amount)
        : Status == OrderStatus.Paid ? GrandTotal : 0;

    /// <summary>
    /// A valid successful payment result: from pending, or from expired when the result arrived after OrderExpiryJob
    /// (VNPay only accepts money before the due time, so the customer paid in time; Q-20).
    /// </summary>
    public void MarkPaid()
    {
        if (IsInstallmentPlan)
            throw new InvalidOperationException($"Order {Code} is paid in installments; use ApplyInstallmentPaid.");
        if (Status is not (OrderStatus.PendingPayment or OrderStatus.Expired))
            throw new InvalidOperationException($"Order {Code} cannot be paid in status {Status}.");
        Status = OrderStatus.Paid;
    }

    /// <summary>
    /// BR-INS-08: a valid successful result for a pending installment. The first one moves the order to <c>PartiallyPaid</c>
    /// (also from expired, Q-20), the last one to <c>Paid</c>. Returns true when this was the first paid installment, the moment
    /// the package is issued.
    /// </summary>
    public bool ApplyInstallmentPaid(OrderInstallment installment, DateTime paidAtUtc)
    {
        ArgumentNullException.ThrowIfNull(installment);
        if (!IsInstallmentPlan || installment.OrderId != Id)
            throw new InvalidOperationException($"Installment {installment.SequenceNumber} does not belong to order {Code}.");
        if (Status is not (OrderStatus.PendingPayment or OrderStatus.Expired or OrderStatus.PartiallyPaid))
            throw new InvalidOperationException($"Order {Code} cannot take an installment in status {Status}.");
        var first = Status != OrderStatus.PartiallyPaid;
        installment.MarkPaid(paidAtUtc);
        Status = Installments.All(item => item.Status == InstallmentStatus.Paid) ? OrderStatus.Paid : OrderStatus.PartiallyPaid;
        return first;
    }

    /// <summary>BR-INS-11: the package was cancelled by the owner; installments not paid yet can no longer be paid.</summary>
    public void CancelPendingInstallments()
    {
        foreach (var installment in Installments)
            installment.Cancel();
    }

    public void Expire()
    {
        if (Status != OrderStatus.PendingPayment)
            throw new InvalidOperationException($"Order {Code} cannot expire in status {Status}.");
        Status = OrderStatus.Expired;
    }

    /// <summary>BR-ORD-04: only an unpaid order is cancelled, also past its due time while OrderExpiryJob has not run yet.</summary>
    public bool IsCancellable => Status == OrderStatus.PendingPayment;

    public void Cancel(string reason, DateTime nowUtc)
    {
        if (!IsCancellable)
            throw new InvalidOperationException($"Order {Code} cannot be cancelled in status {Status}.");
        Status = OrderStatus.Cancelled;
        CancelledAtUtc = nowUtc;
        CancellationReason = reason;
        CancelPendingInstallments();
    }

    /// <summary>
    /// Pending order before its due time, or an installment order with an installment left (BR-INS-05, 07). Whether the package
    /// is still valid is checked by the application.
    /// </summary>
    public bool AcceptsPaymentAttempt(DateTime nowUtc) =>
        (Status == OrderStatus.PendingPayment && nowUtc < PaymentDueAtUtc) ||
        (Status == OrderStatus.PartiallyPaid && NextPendingInstallment is not null);
}
