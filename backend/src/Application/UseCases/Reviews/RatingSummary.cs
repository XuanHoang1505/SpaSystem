using NhuNguyetSpa.Application.DTOs.Reviews;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.UseCases.Reviews;

/// <summary>Rating figures of visible reviews (BR-REV-06).</summary>
public static class RatingSummary
{
    public static RatingSummaryDto From(IReadOnlyDictionary<int, int> countsByRating)
    {
        ArgumentNullException.ThrowIfNull(countsByRating);
        var counts = new Dictionary<string, int>();
        int count = 0, sum = 0;
        for (var rating = Review.MinRating; rating <= Review.MaxRating; rating++)
        {
            var n = countsByRating.GetValueOrDefault(rating);
            counts[rating.ToString(System.Globalization.CultureInfo.InvariantCulture)] = n;
            count += n;
            sum += n * rating;
        }

        return new RatingSummaryDto(Average(count, sum), count, counts);
    }

    /// <summary>Rounded to one decimal, halves away from zero; null without reviews.</summary>
    public static decimal? Average(int count, int sum) =>
        count == 0 ? null : Math.Round((decimal)sum / count, 1, MidpointRounding.AwayFromZero);
}
