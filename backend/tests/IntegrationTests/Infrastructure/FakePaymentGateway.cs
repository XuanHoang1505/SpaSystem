using System.Collections.Concurrent;
using NhuNguyetSpa.Application.Interfaces.Payments;

namespace NhuNguyetSpa.IntegrationTests.Infrastructure;

/// <summary>
/// Test double for VNPay: records payment URL requests and reads plain callback parameters instead of signed ones —
/// <c>code</c> (request code), <c>amount</c>, <c>result</c> (<c>ok</c> = success) and <c>sig</c> (<c>valid</c> = good signature).
/// </summary>
public sealed class FakePaymentGateway : IPaymentGateway
{
    public ConcurrentQueue<PaymentUrlRequest> Requests { get; } = new();

    public string Provider => "vnpay";

    public decimal MinAmount { get; set; } = 5000;

    public bool ProcessesReturnUrl { get; set; } = true;

    public string CreatePaymentUrl(PaymentUrlRequest request)
    {
        Requests.Enqueue(request);
        return "https://pay.test/" + request.RequestCode;
    }

    public PaymentCallback ParseCallback(IReadOnlyDictionary<string, string> parameters) => new(
        parameters.GetValueOrDefault("sig") == "valid",
        parameters.GetValueOrDefault("code"),
        decimal.TryParse(parameters.GetValueOrDefault("amount"), out var amount) ? amount : 0,
        parameters.GetValueOrDefault("result") == "ok",
        parameters.GetValueOrDefault("result") == "ok" ? "00" : "24",
        "TXN" + parameters.GetValueOrDefault("code"));

    /// <summary>Query string of a callback for <paramref name="requestCode"/>.</summary>
    public static string Query(string requestCode, decimal amount, bool success = true, bool validSignature = true) =>
        $"code={requestCode}&amount={amount}&result={(success ? "ok" : "fail")}&sig={(validSignature ? "valid" : "bad")}";
}
