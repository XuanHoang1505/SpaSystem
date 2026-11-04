using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Promotions;

/// <summary>Error codes of UC-SPA-14 and of applying a code to an order (docs/specs/orders.md).</summary>
public static class PromotionErrors
{
    public const string PromotionNotFoundCode = "promotion_not_found";
    public const string PromotionCodeExistsCode = "promotion_code_exists";
    public const string PromotionInUseCode = "promotion_in_use";
    public const string UsageLimitBelowUsedCode = "promotion_usage_limit_below_used";
    public const string InvalidCode = "promotion_invalid";
    public const string NotApplicableCode = "promotion_not_applicable";

    public const string InvalidMessage = "Mã khuyến mãi không tồn tại hoặc không còn hiệu lực.";
    public const string NotApplicableMessage = "Đơn hàng chưa đủ điều kiện dùng mã khuyến mãi này.";

    public static NotFoundException PromotionNotFound()
    {
        return new("Không tìm thấy chương trình khuyến mãi.", PromotionNotFoundCode);
    }

    public static ConflictException PromotionCodeExists()
    {
        return new("Mã khuyến mãi đã tồn tại.", PromotionCodeExistsCode);
    }

    public static ConflictException PromotionInUse()
    {
        return new("Chương trình đã có lượt dùng, không thể đổi mã, hình thức hay giá trị giảm.", PromotionInUseCode);
    }

    public static BusinessRuleException UsageLimitBelowUsed(int counted)
    {
        return new($"Tổng số lượt không được nhỏ hơn số lượt đã dùng ({counted}).", UsageLimitBelowUsedCode);
    }

    public static BusinessRuleException Invalid()
    {
        return new(InvalidMessage, InvalidCode);
    }

    public static BusinessRuleException NotApplicable()
    {
        return new(NotApplicableMessage, NotApplicableCode);
    }
}
