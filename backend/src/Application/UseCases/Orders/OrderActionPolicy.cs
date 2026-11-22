using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.UseCases.Purchases;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Orders;

/// <summary>
/// Which actions an order offers, for lists, details and commands alike (docs/specs/orders.md: BR-ORD-03, 04, 10, Q-44).
/// </summary>
public static class OrderActionPolicy
{
    /// <summary>
    /// A new payment attempt can start: still pending, before the due time, below the attempt limit; or, for an installment order
    /// with the first installment paid, an installment is left, below its attempt limit, and its package is still usable
    /// (BR-INS-05, 07).
    /// </summary>
    public static bool IsPayable(OrderActionFacts facts, DateTime nowUtc, int maxAttempts)
    {
        ArgumentNullException.ThrowIfNull(facts);
        if (facts.Status == OrderStatus.PartiallyPaid)
            return facts.Installment is { NextSequenceNumber: not null } installment && installment.NextAttemptCount < maxAttempts &&
                   PackageUsable(installment, nowUtc);
        return facts.Status == OrderStatus.PendingPayment && nowUtc < facts.PaymentDueAtUtc && facts.PaymentCount < maxAttempts;
    }

    /// <summary>BR-INS-07: later installments can be paid while the package is active and its plan not cancelled.</summary>
    public static bool PackageUsable(InstallmentFacts installment, DateTime nowUtc)
    {
        ArgumentNullException.ThrowIfNull(installment);
        return installment.PackageStatus is { } status &&
               PurchaseStatus.Effective(status, installment.PackageExpiresAtUtc, nowUtc) == CustomerPackageStatus.Active &&
               installment.PlanStatus != TreatmentPlanStatus.Cancelled;
    }

    /// <summary>
    /// The installment fields of an order detail: pending installments of an unusable package read as expired, the amounts paid
    /// and left, and the next installment while it can be paid.
    /// </summary>
    public static (IReadOnlyList<OrderInstallmentDto> Installments, decimal Paid, decimal Remaining, NextInstallmentDto? Next) Installments(
        IReadOnlyList<OrderInstallmentDto> installments, OrderStatus status, decimal grandTotal, InstallmentFacts? facts, DateTime nowUtc)
    {
        ArgumentNullException.ThrowIfNull(installments);
        if (installments.Count == 0)
        {
            var paidInFull = status == OrderStatus.Paid ? grandTotal : 0;
            return ([], paidInFull, grandTotal - paidInFull, null);
        }
        var expired = status == OrderStatus.PartiallyPaid && facts is not null && !PackageUsable(facts, nowUtc);
        var shown = installments
            .Select(item => expired && item.Status == InstallmentState.Pending ? item with { Status = InstallmentState.Expired } : item)
            .ToList();
        var paid = shown.Where(item => item.Status == InstallmentState.Paid).Sum(item => item.Amount);
        var next = status is OrderStatus.PendingPayment or OrderStatus.PartiallyPaid
            ? shown.Where(item => item.Status == InstallmentState.Pending).OrderBy(item => item.SequenceNumber)
                .Select(item => new NextInstallmentDto(item.Id, item.SequenceNumber, item.Amount, item.FirstSessionNumber, item.LastSessionNumber))
                .FirstOrDefault()
            : null;
        return (shown, paid, grandTotal - paid, next);
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
