using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Payments;
using NhuNguyetSpa.Application.UseCases.Payments;

namespace NhuNguyetSpa.Infrastructure.Payments;

/// <summary>VNPay sandbox/production adapter of <see cref="IPaymentGateway"/> (docs/specs/orders.md "VNPay").</summary>
public sealed class VnpayPaymentGateway : IPaymentGateway
{
    public const string ReturnPath = "/api/v1/payments/vnpay/return/";
    private const string HashKey = "vnp_SecureHash";
    private const string HashTypeKey = "vnp_SecureHashType";
    private const string DateFormat = "yyyyMMddHHmmss";

    private readonly IOptions<VnpayOptions> _options;
    private readonly IOptions<PaymentOptions> _paymentOptions;
    private readonly ILogger<VnpayPaymentGateway> _logger;

    public VnpayPaymentGateway(IOptions<VnpayOptions> options, IOptions<PaymentOptions> paymentOptions, ILogger<VnpayPaymentGateway> logger)
    {
        _options = options;
        _paymentOptions = paymentOptions;
        _logger = logger;
    }

    public string Provider
    {
        get { return "vnpay"; }
    }

    public decimal MinAmount
    {
        get { return _options.Value.MinAmount; }
    }

    public bool ProcessesReturnUrl
    {
        get { return _options.Value.ProcessReturnUrl; }
    }

    public string CreatePaymentUrl(PaymentUrlRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        var options = _options.Value;
        var baseUrl = _paymentOptions.Value.PublicApiBaseUrl;
        if (string.IsNullOrWhiteSpace(options.TmnCode) || string.IsNullOrWhiteSpace(options.HashSecret) || string.IsNullOrWhiteSpace(baseUrl))
        {
            // Names only, never values: the hash secret must not reach the logs.
            _logger.LogError("VNPay is not configured: set VNPAY_TMN_CODE, VNPAY_HASH_SECRET and PAYMENT_PUBLIC_API_BASE_URL.");
            throw PaymentErrors.GatewayUnavailable();
        }

        var client = request.Client == PaymentClient.Mobile ? "mobile" : "web";
        var parameters = new Dictionary<string, string>
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = options.TmnCode,
            ["vnp_Amount"] = (request.Amount * 100).ToString("0", CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = "VND",
            ["vnp_TxnRef"] = request.RequestCode,
            // VNPay asks for an unaccented description.
            ["vnp_OrderInfo"] = $"Thanh toan don hang {request.OrderCode}",
            ["vnp_OrderType"] = "other",
            ["vnp_Locale"] = "vn",
            ["vnp_ReturnUrl"] = baseUrl.TrimEnd('/') + ReturnPath + client,
            ["vnp_IpAddr"] = request.ClientIp,
            ["vnp_CreateDate"] = SpaTime.ToLocal(request.CreatedAtUtc).ToString(DateFormat, CultureInfo.InvariantCulture),
            ["vnp_ExpireDate"] = SpaTime.ToLocal(request.ExpiresAtUtc).ToString(DateFormat, CultureInfo.InvariantCulture),
        };
        var signature = VnpaySignature.Sign(parameters, options.HashSecret);
        return $"{options.PaymentUrl}?{VnpaySignature.BuildQuery(parameters)}&{HashKey}={signature}";
    }

    public PaymentCallback ParseCallback(IReadOnlyDictionary<string, string> parameters)
    {
        ArgumentNullException.ThrowIfNull(parameters);
        var secret = _options.Value.HashSecret;
        var signed = parameters
            .Where(pair => pair.Key.StartsWith("vnp_", StringComparison.Ordinal) && pair.Key != HashKey && pair.Key != HashTypeKey &&
                           !string.IsNullOrEmpty(pair.Value))
            .ToList();
        var valid = !string.IsNullOrWhiteSpace(secret) &&
                    parameters.TryGetValue(HashKey, out var received) && !string.IsNullOrEmpty(received) &&
                    CryptographicOperations.FixedTimeEquals(
                        Encoding.ASCII.GetBytes(VnpaySignature.Sign(signed, secret)),
                        Encoding.ASCII.GetBytes(received.ToLowerInvariant()));

        var amount = parameters.TryGetValue("vnp_Amount", out var rawAmount) &&
                     long.TryParse(rawAmount, NumberStyles.None, CultureInfo.InvariantCulture, out var minorUnits)
            ? minorUnits / 100m
            : 0;
        var responseCode = parameters.GetValueOrDefault("vnp_ResponseCode");
        return new PaymentCallback(
            valid,
            parameters.GetValueOrDefault("vnp_TxnRef"),
            amount,
            responseCode == "00" && parameters.GetValueOrDefault("vnp_TransactionStatus") == "00",
            responseCode,
            parameters.GetValueOrDefault("vnp_TransactionNo"));
    }
}
