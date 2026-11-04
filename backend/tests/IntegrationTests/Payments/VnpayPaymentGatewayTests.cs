using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Payments;
using NhuNguyetSpa.Domain.Exceptions;
using NhuNguyetSpa.Infrastructure.Payments;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Payments;

/// <summary>
/// VNPay signing and callback parsing (docs/specs/orders.md: BR-ORD-05, ORD-T24). The reference hash was computed outside .NET
/// with Python's hmac + urllib.parse.quote_plus over the sorted, URL-encoded parameters.
/// </summary>
public sealed class VnpayPaymentGatewayTests
{
    private const string Secret = "TESTSECRET";
    private const string ExpectedHash =
        "94f4cc15b9343bedf6ac0a64d81da52be3efb4b32c18f0c084702a2684a338aefa469c89013c7ba94c52df120de63b01f92af7db6c9f16f06807fc17b5fdcf13";

    // 03:00Z = 10:00 in Vietnam.
    private static readonly PaymentUrlRequest Request = new(
        "DH261027ABCDEF01", 100_000, "DH261027ABCDEF",
        new DateTime(2026, 10, 27, 3, 0, 0, DateTimeKind.Utc), new DateTime(2026, 10, 27, 3, 15, 0, DateTimeKind.Utc),
        "127.0.0.1", PaymentClient.Web);

    private readonly ListLogger _logs = new();

    private VnpayPaymentGateway Create(string? tmnCode = "TESTTMN1", string? secret = Secret, string? baseUrl = "https://api.test/") => new(
        Options.Create(new VnpayOptions { TmnCode = tmnCode, HashSecret = secret, PaymentUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html" }),
        Options.Create(new PaymentOptions { PublicApiBaseUrl = baseUrl }),
        _logs);

    private static Dictionary<string, string> QueryOf(string url) =>
        url[(url.IndexOf('?') + 1)..].Split('&')
            .Select(pair => pair.Split('=', 2))
            .ToDictionary(pair => Uri.UnescapeDataString(pair[0].Replace('+', ' ')), pair => Uri.UnescapeDataString(pair[1].Replace('+', ' ')));

    [Fact]
    public void CreatedUrlMatchesTheReferenceSignature()
    {
        var url = Create().CreatePaymentUrl(Request);

        url.Should().StartWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?");
        var query = QueryOf(url);
        query["vnp_SecureHash"].Should().Be(ExpectedHash);
        query["vnp_Amount"].Should().Be("10000000");
        query["vnp_ReturnUrl"].Should().Be("https://api.test/api/v1/payments/vnpay/return/web");
        query["vnp_OrderInfo"].Should().Be("Thanh toan don hang DH261027ABCDEF");
    }

    [Fact]
    public void FormatsDatesInVietnamTime()
    {
        var late = Request with
        {
            CreatedAtUtc = new DateTime(2026, 10, 27, 17, 30, 0, DateTimeKind.Utc),
            ExpiresAtUtc = new DateTime(2026, 10, 27, 17, 45, 0, DateTimeKind.Utc),
        };

        var query = QueryOf(Create().CreatePaymentUrl(late));

        query["vnp_CreateDate"].Should().Be("20261028003000");
        query["vnp_ExpireDate"].Should().Be("20261028004500");
    }

    [Fact]
    public void MobileClientGetsItsOwnReturnPath()
    {
        QueryOf(Create().CreatePaymentUrl(Request with { Client = PaymentClient.Mobile }))["vnp_ReturnUrl"]
            .Should().Be("https://api.test/api/v1/payments/vnpay/return/mobile");
    }

    [Fact]
    public void CreatedUrlRoundTripsAsValid()
    {
        var gateway = Create();
        var query = QueryOf(gateway.CreatePaymentUrl(Request));
        query["vnp_ResponseCode"] = "00";
        query["vnp_TransactionStatus"] = "00";
        query["vnp_TransactionNo"] = "14123456";
        query["vnp_SecureHash"] = Sign(query);

        var callback = gateway.ParseCallback(query);

        callback.Should().Be(new PaymentCallback(true, "DH261027ABCDEF01", 100_000, true, "00", "14123456"));
    }

    [Fact]
    public void VerifiesValuesWithSpacesAndPlus()
    {
        var query = Callback("00", "00");
        query["vnp_OrderInfo"] = "Thanh toan don hang + uu dai 10%";
        query["vnp_BankCode"] = "NCB";
        query["vnp_SecureHash"] = Sign(query);
        query["vnp_SecureHashType"] = "HmacSHA512";

        Create().ParseCallback(query).IsSignatureValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("24", "02")]
    [InlineData("00", "02")]
    public void NonZeroCodesAreFailures(string responseCode, string transactionStatus)
    {
        var callback = Create().ParseCallback(Callback(responseCode, transactionStatus));

        callback.IsSignatureValid.Should().BeTrue();
        callback.IsSuccess.Should().BeFalse();
        callback.ResponseCode.Should().Be(responseCode);
    }

    [Fact]
    public void TamperedAmountIsInvalid()
    {
        var query = Callback("00", "00");
        query["vnp_Amount"] = "100";

        Create().ParseCallback(query).IsSignatureValid.Should().BeFalse();
    }

    [Fact]
    public void MissingHashIsInvalid()
    {
        var query = Callback("00", "00");
        query.Remove("vnp_SecureHash");

        Create().ParseCallback(query).IsSignatureValid.Should().BeFalse();
    }

    [Fact]
    public void UppercaseHashIsAccepted()
    {
        var query = Callback("00", "00");
        query["vnp_SecureHash"] = query["vnp_SecureHash"].ToUpperInvariant();

        Create().ParseCallback(query).IsSignatureValid.Should().BeTrue();
    }

    [Fact]
    public void ParseWithoutSecretIsInvalidInsteadOfThrowing()
    {
        Create(secret: null).ParseCallback(Callback("00", "00")).IsSignatureValid.Should().BeFalse();
    }

    [Theory]
    [InlineData(null, "SECRETVALUE", "https://api.test")]
    [InlineData("TESTTMN1", null, "https://api.test")]
    [InlineData("TESTTMN1", "SECRETVALUE", null)]
    public void MissingConfigThrowsGatewayUnavailableAndDoesNotLogSecret(string? tmnCode, string? secret, string? baseUrl)
    {
        var exception = FluentActions.Invoking(() => Create(tmnCode, secret, baseUrl).CreatePaymentUrl(Request))
            .Should().Throw<ServiceUnavailableException>();

        exception.Which.Code.Should().Be("payment_gateway_unavailable");
        _logs.Messages.Should().ContainSingle(message => message.Contains("VNPay is not configured"));
        _logs.Messages.Should().NotContain(message => message.Contains("SECRETVALUE"));
    }

    [Fact]
    public void ExposesProviderAndLimits()
    {
        var gateway = new VnpayPaymentGateway(
            Options.Create(new VnpayOptions { MinAmount = 5000, ProcessReturnUrl = true }), Options.Create(new PaymentOptions()), _logs);

        gateway.Provider.Should().Be("vnpay");
        gateway.MinAmount.Should().Be(5000);
        gateway.ProcessesReturnUrl.Should().BeTrue();
    }

    private static Dictionary<string, string> Callback(string responseCode, string transactionStatus)
    {
        var query = new Dictionary<string, string>
        {
            ["vnp_Amount"] = "10000000",
            ["vnp_BankCode"] = "NCB",
            ["vnp_OrderInfo"] = "Thanh toan don hang DH261027ABCDEF",
            ["vnp_PayDate"] = "20261027100500",
            ["vnp_ResponseCode"] = responseCode,
            ["vnp_TmnCode"] = "TESTTMN1",
            ["vnp_TransactionNo"] = "14123456",
            ["vnp_TransactionStatus"] = transactionStatus,
            ["vnp_TxnRef"] = "DH261027ABCDEF01",
        };
        query["vnp_SecureHash"] = Sign(query);
        return query;
    }

    private static string Sign(IReadOnlyDictionary<string, string> query) =>
        VnpaySignature.Sign(query.Where(pair => pair.Key != "vnp_SecureHash" && pair.Key != "vnp_SecureHashType"), Secret);

    private sealed class ListLogger : ILogger<VnpayPaymentGateway>
    {
        public List<string> Messages { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Messages.Add(formatter(state, exception));
    }
}
