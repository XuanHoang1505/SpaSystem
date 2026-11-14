using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Repositories;

namespace NhuNguyetSpa.Application.UseCases.Reviews;

/// <summary>Adds <c>averageRating</c> and <c>reviewCount</c> of visible reviews to catalog lists and details (UC-SPA-29 A4, BR-REV-06).</summary>
public sealed class CatalogRatings
{
    private readonly IReviewRepository _reviews;

    public CatalogRatings(IReviewRepository reviews) => _reviews = reviews;

    public async Task<PagedResult<ServiceListItemDto>> ApplyAsync(PagedResult<ServiceListItemDto> page, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(page);
        var stats = await _reviews.GetRatingStatsAsync(CatalogItemType.Service, page.Items.Select(item => item.Id).ToList(), cancellationToken);
        var items = page.Items.Select(item => stats.TryGetValue(item.Id, out var stat)
            ? item with { AverageRating = RatingSummary.Average(stat.Count, stat.Sum), ReviewCount = stat.Count }
            : item);
        return new PagedResult<ServiceListItemDto>(items, page.PageNumber, page.PageSize, page.TotalCount);
    }

    public async Task<PagedResult<PackageListItemDto>> ApplyAsync(PagedResult<PackageListItemDto> page, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(page);
        var stats = await _reviews.GetRatingStatsAsync(CatalogItemType.Package, page.Items.Select(item => item.Id).ToList(), cancellationToken);
        var items = page.Items.Select(item => stats.TryGetValue(item.Id, out var stat)
            ? item with { AverageRating = RatingSummary.Average(stat.Count, stat.Sum), ReviewCount = stat.Count }
            : item);
        return new PagedResult<PackageListItemDto>(items, page.PageNumber, page.PageSize, page.TotalCount);
    }

    public async Task<ServiceDetailDto> ApplyAsync(ServiceDetailDto detail, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(detail);
        var stats = await _reviews.GetRatingStatsAsync(CatalogItemType.Service, [detail.Id], cancellationToken);
        return stats.TryGetValue(detail.Id, out var stat)
            ? detail with { AverageRating = RatingSummary.Average(stat.Count, stat.Sum), ReviewCount = stat.Count }
            : detail;
    }

    public async Task<PackageDetailDto> ApplyAsync(PackageDetailDto detail, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(detail);
        var stats = await _reviews.GetRatingStatsAsync(CatalogItemType.Package, [detail.Id], cancellationToken);
        return stats.TryGetValue(detail.Id, out var stat)
            ? detail with { AverageRating = RatingSummary.Average(stat.Count, stat.Sum), ReviewCount = stat.Count }
            : detail;
    }
}
