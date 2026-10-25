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
}
