using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.Orders;
using NhuNguyetSpa.Application.UseCases.Promotions;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Orders;

/// <summary>Order/payment codes and promotion code input (docs/specs/orders.md: BR-ORD-07, BR-PRM-04).</summary>
public sealed class OrderCodeGeneratorTests
{
    [Fact]
    public void OrderCodeHasPrefixDateAndAlphabet()
    {
        var now = new DateTime(2026, 10, 27, 3, 0, 0, DateTimeKind.Utc);

        for (var i = 0; i < 500; i++)
            OrderCodeGenerator.NewOrderCode(now).Should().MatchRegex("^DH261027[A-HJ-NP-Z2-9]{6}$");
    }

    [Fact]
    public void OrderCodeUsesVietnamDate()
    {
        OrderCodeGenerator.NewOrderCode(new DateTime(2026, 10, 27, 17, 30, 0, DateTimeKind.Utc)).Should().StartWith("DH261028");
    }

    [Fact]
    public void OrderCodesDiffer()
    {
        var now = new DateTime(2026, 10, 27, 3, 0, 0, DateTimeKind.Utc);

        Enumerable.Range(0, 50).Select(_ => OrderCodeGenerator.NewOrderCode(now)).Distinct().Should().HaveCount(50);
    }

    [Theory]
    [InlineData(1, "DH261027K7Q2MX01")]
    [InlineData(5, "DH261027K7Q2MX05")]
    public void PaymentRequestCodeAppendsAttempt(int attempt, string expected)
    {
        OrderCodeGenerator.PaymentRequestCode("DH261027K7Q2MX", attempt).Should().Be(expected);
    }

    [Theory]
    [InlineData(" sale20 ", "SALE20")]
    [InlineData("Sale20", "SALE20")]
    [InlineData(null, "")]
    [InlineData("   ", "")]
    public void PromotionCodeNormalizeTrimsAndUppercases(string? input, string expected)
    {
        PromotionCode.Normalize(input).Should().Be(expected);
    }
}
