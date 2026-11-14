namespace NhuNguyetSpa.Application.DTOs.Reviews;

/// <summary>Average (1 decimal, null without reviews), count and per-star counts "1".."5" of visible reviews (BR-REV-06).</summary>
public sealed record RatingSummaryDto(decimal? AverageRating, int ReviewCount, IReadOnlyDictionary<string, int> RatingCounts);
