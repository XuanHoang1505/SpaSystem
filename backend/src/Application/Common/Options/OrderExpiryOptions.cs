namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>OrderExpiry</c>: the OrderExpiryJob hosted service (docs/specs/orders.md, BR-ORD-03).</summary>
public sealed class OrderExpiryOptions
{
    public const string SectionName = "OrderExpiry";

    /// <summary>Integration tests turn the job off and call the expiry service directly.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Seconds between two scans (5–3600).</summary>
    public int IntervalSeconds { get; set; } = 60;

    /// <summary>An order expires this many minutes after its due time, so a late IPN is usually handled first (0–120).</summary>
    public int GraceMinutes { get; set; } = 5;

    /// <summary>Most orders expired by one scan (1–1000).</summary>
    public int BatchSize { get; set; } = 200;
}
