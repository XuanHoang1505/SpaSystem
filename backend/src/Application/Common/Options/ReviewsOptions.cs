namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Reviews</c> (docs/specs/reviews.md; Q-05, Q-76).</summary>
public sealed class ReviewsOptions
{
    public const string SectionName = "Reviews";

    /// <summary>Completed sessions a customer needs before reviewing a package (BR-REV-01, Q-05; 1–100).</summary>
    public int MinCompletedPackageSessions { get; set; } = 1;

    /// <summary>Days after creation the customer may edit a review not yet replied to (BR-REV-04, Q-76; 0 = never, 0–365).</summary>
    public int CustomerEditWindowDays { get; set; } = 30;

    /// <summary>Safety cap on <c>GET /me/reviewable</c>, which is not paged (1–1000).</summary>
    public int MaxReviewableItems { get; set; } = 200;

    public static bool IsValid(ReviewsOptions options) =>
        options.MinCompletedPackageSessions is >= 1 and <= 100
        && options.CustomerEditWindowDays is >= 0 and <= 365
        && options.MaxReviewableItems is >= 1 and <= 1000;
}
