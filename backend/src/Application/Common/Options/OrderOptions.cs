namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Order</c> (docs/specs/orders.md, BR-ORD-03, Q-03).</summary>
public sealed class OrderOptions
{
    public const string SectionName = "Order";

    /// <summary>An order waits this long for payment: <c>payment_due_at_utc = created_at_utc + value</c> (1–1440).</summary>
    public int PaymentTimeoutMinutes { get; set; } = 15;
}
