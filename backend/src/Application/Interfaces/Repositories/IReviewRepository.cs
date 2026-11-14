using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Reviews;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>Reads behind UC-SPA-29, 30, 31 (docs/specs/reviews.md).</summary>
public interface IReviewRepository : IRepository<Review>
{
    /// <summary>Visible reviews of one product, newest first, optionally of one rating.</summary>
    Task<PagedResult<PublicReviewDto>> GetPublicPageAsync(
        CatalogItemType type, Guid productId, int? rating, int pageNumber, int pageSize, CancellationToken cancellationToken);

    /// <summary>Visible reviews of one product counted per rating (missing ratings are absent).</summary>
    Task<IReadOnlyDictionary<int, int>> GetRatingCountsAsync(CatalogItemType type, Guid productId, CancellationToken cancellationToken);

    /// <summary>Count and sum of visible ratings per product, for catalog lists and details (BR-REV-06).</summary>
    Task<IReadOnlyDictionary<Guid, (int Count, int Sum)>> GetRatingStatsAsync(
        CatalogItemType type, IReadOnlyCollection<Guid> productIds, CancellationToken cancellationToken);

    /// <summary>What the customer bought or experienced, and their reviews; optionally narrowed to one product.</summary>
    Task<ReviewFacts> GetFactsAsync(Guid customerId, CatalogItemType? onlyType, Guid? onlyProductId, CancellationToken cancellationToken);

    /// <summary>The customer's review, tracked; null when missing or someone else's.</summary>
    Task<Review?> GetMineAsync(Guid id, Guid customerId, CancellationToken cancellationToken);

    Task<MyReviewDto?> GetMineDtoAsync(Guid id, Guid customerId, CancellationToken cancellationToken);

    /// <summary>The customer's reviews of every status, newest first.</summary>
    Task<PagedResult<MyReviewDto>> GetMinePageAsync(Guid customerId, int pageNumber, int pageSize, CancellationToken cancellationToken);

    Task<PagedResult<OwnerReviewDto>> SearchAsync(OwnerReviewCriteria criteria, CancellationToken cancellationToken);

    Task<OwnerReviewDto?> GetOwnerDtoAsync(Guid id, CancellationToken cancellationToken);
}
