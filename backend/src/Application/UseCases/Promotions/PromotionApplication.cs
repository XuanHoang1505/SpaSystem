using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.UseCases.Promotions;

/// <summary>Result of applying a code to an order total: a discount, or the reason the code does not apply.</summary>
public sealed record PromotionApplication(Promotion? Promotion, string? Code, decimal DiscountTotal, string? ErrorCode, string? ErrorMessage)
{
    public static PromotionApplication None { get; } = new(null, null, 0, null, null);

    public bool HasError
    {
        get { return ErrorCode != null; }
    }

    public static PromotionApplication Failed(string code, string errorCode, string errorMessage)
    {
        return new(null, code, 0, errorCode, errorMessage);
    }
}
