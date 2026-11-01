using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Orders;

/// <summary>
/// Which actions an order offers, for lists, details and commands alike (docs/specs/orders.md: BR-ORD-03, 04, 10, Q-44).
/// </summary>
public static class OrderActionPolicy
{
    /// <summary>A new payment attempt can start: still pending, before the due time, below the attempt limit.</summary>
    public static bool IsPayable(OrderActionFacts facts, DateTime nowUtc, int maxAttempts)
    {
        ArgumentNullException.ThrowIfNull(facts);
        return facts.Status == OrderStatus.PendingPayment && nowUtc < facts.PaymentDueAtUtc && facts.PaymentCount < maxAttempts;
    }

    /// <summary>Q-44: how long the customer still has to wait after the latest pending attempt, or null when not blocked.</summary>
    public static TimeSpan? CustomerCancelBlockedFor(OrderActionFacts facts, DateTime nowUtc, int blockMinutes)
    {
        ArgumentNullException.ThrowIfNull(facts);
        if (blockMinutes <= 0 || facts.LatestPendingPaymentAtUtc is not { } startedAtUtc)
            return null;
        var remaining = startedAtUtc.AddMinutes(blockMinutes) - nowUtc;
        return remaining > TimeSpan.Zero ? remaining : null;
    }

    public static bool CustomerCanCancel(OrderActionFacts facts, DateTime nowUtc, int blockMinutes)
    {
        ArgumentNullException.ThrowIfNull(facts);
        return OwnerCanCancel(facts.Status) && CustomerCancelBlockedFor(facts, nowUtc, blockMinutes) is null;
    }

    /// <summary>BR-ORD-04: only an unpaid order, also past its due time while the expiry job has not run.</summary>
    public static bool OwnerCanCancel(OrderStatus status) => status == OrderStatus.PendingPayment;
}
