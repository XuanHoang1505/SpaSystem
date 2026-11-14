using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary><see cref="ImageUrl"/> falls back to the first item's service image (BR-CAT-07).</summary>
public sealed record PackageListItemDto(
    Guid Id,
    string Name,
    decimal Price,
    int ValidityDays,
    int TotalSessions,
    string? ImageUrl,
    CatalogStatus Status,
    DateOnly? SaleStartDate,
    DateOnly? SaleEndDate)
{
    public string? ShortDescription { get; init; }

    /// <summary>Sum of each item's current service price × its sessions: what the sessions cost bought one by one.</summary>
    public decimal RetailPrice { get; init; }

    /// <summary>Average of visible reviews, one decimal; null without reviews (UC-SPA-29, BR-REV-06).</summary>
    public decimal? AverageRating { get; init; }

    /// <summary>Number of visible reviews.</summary>
    public int ReviewCount { get; init; }
}
