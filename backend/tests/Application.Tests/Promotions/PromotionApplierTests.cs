using FluentAssertions;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Promotions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Promotions;

/// <summary>Applying a code to an order (docs/specs/orders.md: BR-PRM-01, 02; PRM-T10, UAT-17, UAT-18).</summary>
public sealed class PromotionApplierTests
{
    private static readonly DateTime Now = StaffTestDoubles.Now;
    private static readonly Guid Customer = Guid.NewGuid();
    private readonly IPromotionRepository _promotions = Substitute.For<IPromotionRepository>();
    private readonly Promotion _promotion = new()
    {
        Code = "SALE20",
        DiscountType = DiscountType.Percentage,
        DiscountValue = 20,
        MaxDiscountAmount = 100_000,
        MinOrderAmount = 300_000,
        StartsAtUtc = Now.AddDays(-1),
        EndsAtUtc = Now.AddDays(1),
        UsageLimit = 10,
        PerCustomerLimit = 1,
        Status = PromotionStatus.Active,
    };

    public PromotionApplierTests() =>
        _promotions.GetByCodeAsync("SALE20", Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(_promotion);

    private PromotionApplier Create() => new(_promotions, StaffTestDoubles.Clock());

    private Task<PromotionApplication> Apply(decimal subtotal = 800_000, string code = "SALE20", bool lockRow = false) =>
        Create().ApplyAsync(code, subtotal, Customer, lockRow, CancellationToken.None);

    [Fact]
    public async Task AppliesCappedPercentage()
    {
        var result = await Apply();

        result.HasError.Should().BeFalse();
        result.Promotion.Should().BeSameAs(_promotion);
        result.Code.Should().Be("SALE20");
        result.DiscountTotal.Should().Be(100_000);
    }

    [Fact]
    public async Task NormalizesCustomerInput()
    {
        (await Apply(code: " sale20 ")).DiscountTotal.Should().Be(100_000);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("  ")]
    public async Task BlankCodeIsNone(string? code)
    {
        var result = await Create().ApplyAsync(code, 800_000, Customer, false, CancellationToken.None);

        result.Should().Be(PromotionApplication.None);
        await _promotions.DidNotReceiveWithAnyArgs().GetByCodeAsync(default!, default, default);
    }

    [Fact]
    public async Task LockRowIsPassedThrough()
    {
        await Apply(lockRow: true);

        await _promotions.Received(1).GetByCodeAsync("SALE20", true, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UnknownCodeIsInvalid() => (await Apply(code: "NOPE")).ErrorCode.Should().Be("promotion_invalid");

    [Fact]
    public async Task StoppedIsInvalid()
    {
        _promotion.ChangeStatus(PromotionStatus.Stopped);

        (await Apply()).ErrorCode.Should().Be("promotion_invalid");
    }

    [Fact]
    public async Task NotStartedIsInvalid()
    {
        _promotion.StartsAtUtc = Now.AddSeconds(1);

        (await Apply()).ErrorCode.Should().Be("promotion_invalid");
    }

    [Fact]
    public async Task EndingNowIsInvalid()
    {
        _promotion.EndsAtUtc = Now;

        var result = await Apply();

        result.ErrorCode.Should().Be("promotion_invalid");
        result.ErrorMessage.Should().NotBeNullOrWhiteSpace();
        result.DiscountTotal.Should().Be(0);
    }

    [Fact]
    public async Task BelowMinimumIsNotApplicable() => (await Apply(subtotal: 299_999)).ErrorCode.Should().Be("promotion_not_applicable");

    [Fact]
    public async Task UsageLimitReachedIsNotApplicable()
    {
        _promotions.CountCountedRedemptionsAsync(_promotion.Id, null, Now, Arg.Any<CancellationToken>()).Returns(10);

        (await Apply()).ErrorCode.Should().Be("promotion_not_applicable");
    }

    [Fact]
    public async Task CustomerLimitReachedIsNotApplicable()
    {
        _promotions.CountCountedRedemptionsAsync(_promotion.Id, Customer, Now, Arg.Any<CancellationToken>()).Returns(1);

        (await Apply()).ErrorCode.Should().Be("promotion_not_applicable");
    }

    [Fact]
    public async Task UnlimitedPromotionSkipsCounting()
    {
        _promotion.UsageLimit = null;
        _promotion.PerCustomerLimit = null;

        (await Apply()).HasError.Should().BeFalse();
        await _promotions.DidNotReceiveWithAnyArgs().CountCountedRedemptionsAsync(default, default, default, default);
    }
}
