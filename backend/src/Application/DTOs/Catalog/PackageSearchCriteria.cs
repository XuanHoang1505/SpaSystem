using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary>
/// Normalized package search. <see cref="PublicOn"/> set → only on_sale packages whose sale window contains that Vietnam
/// date (BR-CAT-01); null → owner view, where <see cref="Status"/> may filter.
/// </summary>
public sealed record PackageSearchCriteria(
    string? Search,
    decimal? MinPrice,
    decimal? MaxPrice,
    CatalogStatus? Status,
    DateOnly? PublicOn,
    CatalogSortField SortBy,
    SortDirection SortDirection,
    int PageNumber,
    int PageSize);
