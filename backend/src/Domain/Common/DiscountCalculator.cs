using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Common;

/// <summary>
/// Promotion discount of an order and its split over the order lines (BR-PRM-02). Amounts are whole VND: rounding is always
/// down, so the spa never gives more than the promotion promises.
/// </summary>
public static class DiscountCalculator
{
    public static decimal CalculateTotal(DiscountType type, decimal value, decimal? maxDiscountAmount, decimal subtotal)
    {
        if (subtotal <= 0)
            return 0;

        var discount = type switch
        {
            DiscountType.Percentage => decimal.Floor(subtotal * value / 100),
            DiscountType.FixedAmount => decimal.Floor(value),
            _ => throw new ArgumentOutOfRangeException(nameof(type), type, null),
        };
        if (type == DiscountType.Percentage && maxDiscountAmount is { } max)
            discount = Math.Min(discount, max);
        return Math.Min(discount, subtotal);
    }

    /// <summary>
    /// Splits <paramref name="discountTotal"/> in proportion to <paramref name="unitPrices"/>, each share rounded down; the đồng
    /// left over go one each to the lines with the largest dropped fraction (ties: higher price, then earlier line). The shares
    /// sum to <paramref name="discountTotal"/> and none exceeds its line's price.
    /// </summary>
    public static IReadOnlyList<decimal> Allocate(decimal discountTotal, IReadOnlyList<decimal> unitPrices)
    {
        ArgumentNullException.ThrowIfNull(unitPrices);
        var subtotal = unitPrices.Sum();
        var shares = new decimal[unitPrices.Count];
        if (subtotal <= 0 || discountTotal <= 0)
            return shares;
        if (discountTotal > subtotal)
            throw new ArgumentOutOfRangeException(nameof(discountTotal), "The discount cannot exceed the subtotal.");

        var fractions = new decimal[unitPrices.Count];
        for (var i = 0; i < unitPrices.Count; i++)
        {
            var exact = discountTotal * unitPrices[i] / subtotal;
            shares[i] = decimal.Floor(exact);
            fractions[i] = exact - shares[i];
        }

        var left = (int)(discountTotal - shares.Sum());
        var order = Enumerable.Range(0, unitPrices.Count)
            .OrderByDescending(i => fractions[i])
            .ThenByDescending(i => unitPrices[i])
            .ThenBy(i => i);
        foreach (var i in order.Take(left))
            shares[i] += 1;
        return shares;
    }
}
