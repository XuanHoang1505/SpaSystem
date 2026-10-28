namespace NhuNguyetSpa.Infrastructure.Payments;

/// <summary>
/// Section <c>Vnpay</c>. <see cref="TmnCode"/> and <see cref="HashSecret"/> come from <c>VNPAY_TMN_CODE</c> /
/// <c>VNPAY_HASH_SECRET</c> in .env and are checked on each call, so the API starts without them.
/// </summary>
public sealed class VnpayOptions
{
    public const string SectionName = "Vnpay";

    public string? TmnCode { get; set; }

    /// <summary>Secret: never logged or returned.</summary>
    public string? HashSecret { get; set; }

    public string PaymentUrl { get; set; } = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    /// <summary>VNPay refuses smaller amounts (Q-22).</summary>
    public decimal MinAmount { get; set; } = 5000;

    /// <summary>Record results from the verified browser return URL too (Development; Q-19). IPN is always processed.</summary>
    public bool ProcessReturnUrl { get; set; }
}
