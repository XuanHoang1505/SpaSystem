using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Validators.Orders;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Orders;

/// <summary>Order preview/create body (docs/specs/orders.md UC-SPA-11 E9).</summary>
public sealed class OrderRequestValidatorTests
{
    private readonly OrderRequestValidator _validator = new();

    [Fact]
    public void CartWithoutIdsPasses() => _validator.Validate(new OrderRequest(OrderSource.Cart, null, null, "SALE20")).IsValid.Should().BeTrue();

    [Fact]
    public void BuyNowWithOneIdPasses()
    {
        _validator.Validate(new OrderRequest(OrderSource.BuyNow, Guid.NewGuid(), null, null)).IsValid.Should().BeTrue();
        _validator.Validate(new OrderRequest(OrderSource.BuyNow, null, Guid.NewGuid(), null)).IsValid.Should().BeTrue();
    }

    [Fact]
    public void CartWithIdFails() => _validator.Validate(new OrderRequest(OrderSource.Cart, Guid.NewGuid(), null, null)).IsValid.Should().BeFalse();

    [Fact]
    public void BuyNowNeedsExactlyOneId()
    {
        _validator.Validate(new OrderRequest(OrderSource.BuyNow, null, null, null)).IsValid.Should().BeFalse();
        _validator.Validate(new OrderRequest(OrderSource.BuyNow, Guid.NewGuid(), Guid.NewGuid(), null)).IsValid.Should().BeFalse();
    }

    [Fact]
    public void SourceIsRequired() => _validator.Validate(new OrderRequest(null, null, null, null)).IsValid.Should().BeFalse();

    [Fact]
    public void PromotionCodeIsAtMost50Characters()
    {
        _validator.Validate(new OrderRequest(OrderSource.Cart, null, null, new string('A', 50))).IsValid.Should().BeTrue();
        _validator.Validate(new OrderRequest(OrderSource.Cart, null, null, new string('A', 51))).IsValid.Should().BeFalse();
    }
}
