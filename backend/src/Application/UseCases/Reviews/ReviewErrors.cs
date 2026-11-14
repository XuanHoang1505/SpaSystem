using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Reviews;

/// <summary>Error codes of reviews (docs/specs/reviews.md).</summary>
public static class ReviewErrors
{
    public const string NotFoundCode = "review_not_found";
    public const string NotEligibleCode = "review_not_eligible";
    public const string ExistsCode = "review_exists";
    public const string LockedCode = "review_locked";

    public static NotFoundException NotFound() => new("Không tìm thấy đánh giá.", NotFoundCode);

    public static BusinessRuleException NotEligible(string message) => new(message, NotEligibleCode);

    public static ConflictException Exists() =>
        new("Bạn đã đánh giá sản phẩm này. Bạn có thể sửa đánh giá cũ.", ExistsCode);

    public static ConflictException Locked() =>
        new("Đánh giá không còn sửa được: đã quá hạn sửa hoặc spa đã phản hồi.", LockedCode);
}
