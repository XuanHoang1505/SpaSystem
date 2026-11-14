using NhuNguyetSpa.Application.DTOs.Reviews;

namespace NhuNguyetSpa.Application.UseCases.Reviews;

/// <summary>Who may review what (BR-REV-01, 03); shared by <c>GET /me/reviewable</c> and <c>POST /me/reviews</c>.</summary>
public static class ReviewEligibility
{
    public static ReviewIneligibility ForService(ReviewServiceFact? fact, Guid? existingReviewId)
    {
        if (existingReviewId.HasValue)
            return ReviewIneligibility.AlreadyReviewed;
        return fact is { Used: true } ? ReviewIneligibility.None : ReviewIneligibility.NotUsedYet;
    }

    public static ReviewIneligibility ForPackage(ReviewPackageFact? fact, int minCompletedSessions, Guid? existingReviewId)
    {
        if (existingReviewId.HasValue)
            return ReviewIneligibility.AlreadyReviewed;
        return fact is not null && fact.MaxUsedSessions >= minCompletedSessions
            ? ReviewIneligibility.None
            : ReviewIneligibility.NotEnoughSessions;
    }

    public static string Message(ReviewIneligibility reason, int minCompletedSessions) => reason switch
    {
        ReviewIneligibility.NotUsedYet => "Bạn cần sử dụng dịch vụ này trước khi đánh giá.",
        ReviewIneligibility.NotEnoughSessions => $"Bạn cần hoàn thành ít nhất {minCompletedSessions} buổi của gói trước khi đánh giá.",
        ReviewIneligibility.AlreadyReviewed => "Bạn đã đánh giá sản phẩm này.",
        _ => string.Empty,
    };
}
