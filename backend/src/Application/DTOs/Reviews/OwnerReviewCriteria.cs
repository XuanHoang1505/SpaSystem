using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Reviews;

/// <summary>Parsed filters of <c>GET /reviews</c>; dates already turned into UTC bounds of Vietnam days.</summary>
public sealed record OwnerReviewCriteria(
    string? Search,
    int? Rating,
    CatalogItemType? ProductType,
    Guid? SpaServiceId,
    Guid? ServicePackageId,
    ReviewStatus? Status,
    bool? HasReply,
    DateTime? FromUtc,
    DateTime? ToUtcExclusive,
    int PageNumber,
    int PageSize);
