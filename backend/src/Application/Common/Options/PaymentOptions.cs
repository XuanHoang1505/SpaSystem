namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Payment</c> (docs/specs/orders.md, BR-ORD-10).</summary>
public sealed class PaymentOptions
{
    public const string SectionName = "Payment";

    /// <summary>Public base URL of this API (<c>PAYMENT_PUBLIC_API_BASE_URL</c>); the gateway sends the browser back to it.</summary>
    public string? PublicApiBaseUrl { get; set; }

    /// <summary>Client result pages that the return URL redirects to with <c>?orderId=</c>.</summary>
    public PaymentClientReturnUrls ClientReturnUrls { get; set; } = new();

    /// <summary>Most payment attempts one order may have (1–20).</summary>
    public int MaxAttemptsPerOrder { get; set; } = 5;
}

public sealed class PaymentClientReturnUrls
{
    public string? Web { get; set; }
    public string? Mobile { get; set; }
}
