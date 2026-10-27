using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary>
/// Normalized service search. <see cref="PublicOnly"/> limits results to on_sale (BR-CAT-01); <see cref="Status"/> is only
/// set for the owner.
/// </summary>
public sealed record ServiceSearchCriteria(
    string? Search,
    string? Category,
    decimal? MinPrice,
    decimal? MaxPrice,
    CatalogStatus? Status,
    bool PublicOnly,
    CatalogSortField SortBy,
    SortDirection SortDirection,
    int PageNumber,
    int PageSize);
