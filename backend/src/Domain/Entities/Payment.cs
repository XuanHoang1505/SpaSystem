using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>payments</c> (thesis: ThanhToan). See docs/domain/data-model.md.</summary>
public sealed class Payment : BaseAuditableEntity
{
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public string Provider { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; }
    public string RequestCode { get; set; } = string.Empty;
    public string? ProviderTransactionId { get; set; }
    public string? PaymentUrl { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? PaidAtUtc { get; set; }

    /// <summary>A gateway result still changes this attempt: pending, or expired by OrderExpiryJob before the result came (Q-20).</summary>
    public bool IsOpen => Status is PaymentStatus.Pending or PaymentStatus.Expired;

    public void MarkSucceeded(string? providerTransactionId, DateTime paidAtUtc)
    {
        EnsureOpen();
        Status = PaymentStatus.Succeeded;
        ProviderTransactionId = providerTransactionId;
        PaidAtUtc = paidAtUtc;
    }

    public void MarkFailed(string? providerTransactionId)
    {
        EnsureOpen();
        Status = PaymentStatus.Failed;
        ProviderTransactionId = providerTransactionId;
    }

    public void Expire()
    {
        if (Status != PaymentStatus.Pending)
            throw new InvalidOperationException($"Payment {RequestCode} cannot expire in status {Status}.");
        Status = PaymentStatus.Expired;
    }

    private void EnsureOpen()
    {
        if (!IsOpen)
            throw new InvalidOperationException($"Payment {RequestCode} was already processed ({Status}).");
    }
}
