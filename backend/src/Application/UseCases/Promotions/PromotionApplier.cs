using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Promotions;

/// <summary>
/// Checks a customer's code against an order subtotal (BR-PRM-01) and computes the discount (BR-PRM-02). Errors are returned,
/// not thrown: the preview shows them under the code box, order creation turns them into a 400.
/// </summary>
public sealed class PromotionApplier
{
    private readonly IPromotionRepository _promotions;
    private readonly IDateTimeProvider _clock;

    public PromotionApplier(IPromotionRepository promotions, IDateTimeProvider clock)
    {
        _promotions = promotions;
        _clock = clock;
    }

    /// <param name="lockRow">Order creation locks the promotion row so two orders cannot both take the last use.</param>
    public async Task<PromotionApplication> ApplyAsync(string? code, decimal subtotal, Guid customerId, bool lockRow, CancellationToken cancellationToken)
    {
        var normalized = PromotionCode.Normalize(code);
        if (normalized.Length == 0)
            return PromotionApplication.None;

        var now = _clock.UtcNow;
        var promotion = await _promotions.GetByCodeAsync(normalized, lockRow, cancellationToken);
        if (promotion == null || promotion.Status != PromotionStatus.Active || now < promotion.StartsAtUtc || now >= promotion.EndsAtUtc)
            return PromotionApplication.Failed(normalized, PromotionErrors.InvalidCode, PromotionErrors.InvalidMessage);
        var notApplicable = subtotal < promotion.MinOrderAmount;
        if (!notApplicable && promotion.UsageLimit.HasValue)
        {
            var used = await _promotions.CountCountedRedemptionsAsync(promotion.Id, null, now, cancellationToken);
            notApplicable = used >= promotion.UsageLimit.Value;
        }
        if (!notApplicable && promotion.PerCustomerLimit.HasValue)
        {
            var usedByCustomer = await _promotions.CountCountedRedemptionsAsync(promotion.Id, customerId, now, cancellationToken);
            notApplicable = usedByCustomer >= promotion.PerCustomerLimit.Value;
        }
        if (notApplicable)
            return PromotionApplication.Failed(normalized, PromotionErrors.NotApplicableCode, PromotionErrors.NotApplicableMessage);

        var discount = DiscountCalculator.CalculateTotal(promotion.DiscountType, promotion.DiscountValue, promotion.MaxDiscountAmount, subtotal);
        return new PromotionApplication(promotion, promotion.Code, discount, null, null);
    }
}
