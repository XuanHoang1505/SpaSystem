namespace NhuNguyetSpa.Application.Interfaces.Payments;

/// <summary>
/// Online payment gateway port (VNPay today, Q-08). Application only sees request codes, amounts and a verified result;
/// signing, parameter names and URLs stay in the adapter.
/// </summary>
public interface IPaymentGateway
{
    /// <summary>Stored in <c>payments.provider</c>.</summary>
    string Provider { get; }

    /// <summary>Smallest amount the gateway accepts (orders between 1 đ and this are refused, Q-22).</summary>
    decimal MinAmount { get; }

    /// <summary>Whether a verified browser return URL also records the result (Development only, Q-19).</summary>
    bool ProcessesReturnUrl { get; }

    /// <summary>Signed payment page URL. Throws <c>payment_gateway_unavailable</c> when the gateway is not configured.</summary>
    string CreatePaymentUrl(PaymentUrlRequest request);

    /// <summary>Reads and verifies callback parameters; never throws for bad input (<see cref="PaymentCallback.IsSignatureValid"/> is false).</summary>
    PaymentCallback ParseCallback(IReadOnlyDictionary<string, string> parameters);
}
