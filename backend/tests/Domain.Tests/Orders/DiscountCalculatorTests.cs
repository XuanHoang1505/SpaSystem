using FluentAssertions;
using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Domain.Tests.Orders;

/// <summary>Discount amount and its split over order lines (docs/specs/orders.md: BR-PRM-02, PRM-T09).</summary>
public sealed class DiscountCalculatorTests
{
    [Theory]
    [InlineData(DiscountType.Percentage, 20, 100_000d, 800_000, 100_000)] // UAT-17
    [InlineData(DiscountType.Percentage, 10, null, 999, 99)]             // rounded down
    [InlineData(DiscountType.Percentage, 100, null, 450_000, 450_000)]
    [InlineData(DiscountType.Percentage, 12.5, null, 100_001, 12_500)]
    [InlineData(DiscountType.FixedAmount, 50_000, null, 30_000, 30_000)] // never more than the subtotal
    [InlineData(DiscountType.FixedAmount, 50_000, null, 80_000, 50_000)]
    [InlineData(DiscountType.FixedAmount, 50_000, null, 0, 0)]
    public void CalculateTotalFollowsBrPrm02(DiscountType type, double value, double? max, double subtotal, double expected)
    {
        DiscountCalculator.CalculateTotal(type, (decimal)value, (decimal?)max, (decimal)subtotal).Should().Be((decimal)expected);
    }

    [Fact]
    public void AllocateSplitsProportionally()
    {
        DiscountCalculator.Allocate(100_000, [300_000, 300_000, 200_000]).Should().Equal(37_500m, 37_500m, 25_000m);
    }

    [Fact]
    public void AllocateGivesRemainderToLargestFractionThenHigherPriceThenFirst()
    {
        DiscountCalculator.Allocate(100_000, [100_000, 100_000, 100_000]).Should().Equal(33_334m, 33_333m, 33_333m);
        // 100 × 150/350 = 42.857, 100 × 200/350 = 57.142 → floors 42 + 57 = 99, the larger fraction (.857) gets the 1 đ.
        DiscountCalculator.Allocate(100, [150, 200]).Should().Equal(43m, 57m);
    }

    [Fact]
    public void AllocateGivesNothingToFreeLines()
    {
        DiscountCalculator.Allocate(1_000, [0, 5_000]).Should().Equal(0m, 1_000m);
    }

    [Fact]
    public void AllocateWithoutDiscountIsAllZero()
    {
        DiscountCalculator.Allocate(0, [10_000, 20_000]).Should().Equal(0m, 0m);
        DiscountCalculator.Allocate(0, [0, 0]).Should().Equal(0m, 0m);
    }

    [Fact]
    public void AllocateAlwaysSumsToTotalAndNeverExceedsAPrice()
    {
        var random = new Random(20261027);
        for (var run = 0; run < 200; run++)
        {
            var prices = Enumerable.Range(0, random.Next(1, 8)).Select(_ => (decimal)random.Next(0, 2_000_000)).ToArray();
            var subtotal = prices.Sum();
            var total = subtotal == 0 ? 0 : (decimal)random.NextInt64(0, (long)subtotal + 1);

            var shares = DiscountCalculator.Allocate(total, prices);

            shares.Sum().Should().Be(total);
            shares.Zip(prices).Should().OnlyContain(pair => pair.First >= 0 && pair.First <= pair.Second && pair.First == decimal.Floor(pair.First));
        }
    }
}
