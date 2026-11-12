using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Promotions;
using NhuNguyetSpa.Application.Validators.Promotions;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Promotions;

/// <summary>BR-PRM-04, 05 (docs/specs/orders.md PRM-T03). The validator sees the normalized (upper-case) code.</summary>
public sealed class PromotionValidatorTests
{
    private static readonly DateTime Start = new(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc);
    private readonly SavePromotionRequestValidator _validator = new();

    private static SavePromotionRequest Valid() =>
        new("SALE20", null, DiscountType.Percentage, 20, 0, 100_000, Start, Start.AddDays(30), 1, 100);

    private string[] Fields(SavePromotionRequest request) =>
        _validator.Validate(request).Errors.Select(error => char.ToLowerInvariant(error.PropertyName[0]) + error.PropertyName[1..]).Distinct().ToArray();

    [Fact]
    public void ValidRequestPasses() => Fields(Valid()).Should().BeEmpty();

    [Theory]
    [InlineData(0)]
    [InlineData(100.01)]
    [InlineData(10.005)]
    public void PercentageOutOfRangeFails(double value) =>
        Fields(Valid() with { DiscountValue = (decimal)value }).Should().Equal("discountValue");

    [Theory]
    [InlineData(100)]
    [InlineData(0.01)]
    [InlineData(12.5)]
    public void PercentageInRangePasses(double value) => Fields(Valid() with { DiscountValue = (decimal)value }).Should().BeEmpty();

    [Theory]
    [InlineData(1.5)]
    [InlineData(0)]
    [InlineData(1_000_000_000)]
    public void FixedAmountMustBeWholeVndInRange(double value) =>
        Fields(Valid() with { DiscountType = DiscountType.FixedAmount, MaxDiscountAmount = null, DiscountValue = (decimal)value })
            .Should().Equal("discountValue");

    [Fact]
    public void MaxDiscountOnlyForPercentage() =>
        Fields(Valid() with { DiscountType = DiscountType.FixedAmount, DiscountValue = 50_000 }).Should().Equal("maxDiscountAmount");

    [Fact]
    public void EndMustBeAfterStart() => Fields(Valid() with { EndsAtUtc = Start }).Should().Equal("endsAtUtc");

    [Theory]
    [InlineData("AB")]
    [InlineData("SALE 20")]
    [InlineData("ĐẸP20")]
    [InlineData("")]
    public void CodeMustMatchPattern(string code) => Fields(Valid() with { Code = code }).Should().Equal("code");

    [Fact]
    public void LimitsAndAmountsHaveBounds()
    {
        Fields(Valid() with { PerCustomerLimit = 0 }).Should().Equal("perCustomerLimit");
        Fields(Valid() with { PerCustomerLimit = 1001 }).Should().Equal("perCustomerLimit");
        Fields(Valid() with { UsageLimit = 1_000_001 }).Should().Equal("usageLimit");
        Fields(Valid() with { MinOrderAmount = -1 }).Should().Equal("minOrderAmount");
        Fields(Valid() with { MinOrderAmount = 1.5m }).Should().Equal("minOrderAmount");
        Fields(Valid() with { MaxDiscountAmount = 0 }).Should().Equal("maxDiscountAmount");
        Fields(Valid() with { Description = new string('a', 1001) }).Should().Equal("description");
    }

    [Fact]
    public void RequiredFieldsAreReported() =>
        Fields(new SavePromotionRequest(null, null, null, null, null, null, null, null, null, null))
            .Should().BeEquivalentTo("code", "discountType", "discountValue", "minOrderAmount", "startsAtUtc", "endsAtUtc");

    [Fact]
    public void FilterRejectsUnknownStatusAndReversedDates()
    {
        var validator = new PromotionFilterValidator();

        validator.Validate(new PromotionFilter { Status = "expired" }).IsValid.Should().BeFalse();
        validator.Validate(new PromotionFilter { FromDate = new DateOnly(2026, 11, 2), ToDate = new DateOnly(2026, 11, 1) }).IsValid.Should().BeFalse();
        validator.Validate(new PromotionFilter { Status = "stopped", FromDate = new DateOnly(2026, 11, 1), ToDate = new DateOnly(2026, 11, 1) })
            .IsValid.Should().BeTrue();
    }
}
