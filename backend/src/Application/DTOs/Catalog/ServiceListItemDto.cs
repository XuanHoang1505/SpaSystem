using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

public sealed record ServiceListItemDto(Guid Id, string Name, Guid CategoryId, string Category, decimal Price, int DurationMinutes, string? ImageUrl, CatalogStatus Status)
{
    public string? ShortDescription { get; init; }

    /// <summary>Average of visible reviews, one decimal; null without reviews (UC-SPA-29, BR-REV-06).</summary>
    public decimal? AverageRating { get; init; }

    /// <summary>Number of visible reviews.</summary>
    public int ReviewCount { get; init; }
}
