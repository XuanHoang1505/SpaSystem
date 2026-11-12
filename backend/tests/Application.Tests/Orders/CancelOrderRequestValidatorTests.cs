using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Validators.Orders;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Orders;

/// <summary>Cancel reason, required for customer and owner (docs/specs/orders.md: BR-ORD-04, Q-43).</summary>
public sealed class CancelOrderRequestValidatorTests
{
    private readonly CancelOrderRequestValidator _validator = new();

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void BlankReasonIsInvalid(string? reason)
    {
        var result = _validator.Validate(new CancelOrderRequest(reason));

        result.IsValid.Should().BeFalse();
        result.Errors.Single().ErrorMessage.Should().Be("Vui lòng nhập lý do hủy.");
    }

    [Fact]
    public void ReasonLongerThan500IsInvalid()
    {
        var result = _validator.Validate(new CancelOrderRequest(new string('a', 501)));

        result.Errors.Single().ErrorMessage.Should().Be("Lý do hủy tối đa 500 ký tự.");
    }

    [Fact]
    public void ReasonOf500AfterTrimIsValid()
    {
        _validator.Validate(new CancelOrderRequest("  " + new string('a', 500) + "  ")).IsValid.Should().BeTrue();
    }
}
