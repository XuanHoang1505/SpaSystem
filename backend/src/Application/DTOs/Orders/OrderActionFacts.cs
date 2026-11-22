using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>What <c>OrderActionPolicy</c> needs to know about an order: its state and its payment attempts.</summary>
/// <remarks><see cref="Installment"/> is set for an installment order (BR-INS-05, 07).</remarks>
public sealed record OrderActionFacts(
    OrderStatus Status, DateTime PaymentDueAtUtc, int PaymentCount, DateTime? LatestPendingPaymentAtUtc, InstallmentFacts? Installment = null)
{
    public static OrderActionFacts From(OrderStatus status, DateTime dueAtUtc, IEnumerable<OrderPaymentDto> payments)
    {
        ArgumentNullException.ThrowIfNull(payments);
        var list = payments.ToList();
        var pending = list.Where(payment => payment.Status == PaymentStatus.Pending).ToList();
        return new OrderActionFacts(status, dueAtUtc, list.Count, pending.Count == 0 ? null : pending.Max(payment => payment.CreatedAtUtc));
    }
}
