using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary><see cref="ImageUrl"/> falls back to the first item's service image (BR-CAT-07); items are ordered by sort order.</summary>
public sealed record PackageDetailDto(
    Guid Id,
    string Name,
    string? Description,
    decimal Price,
    int ValidityDays,
    int TotalSessions,
    string? ImageUrl,
    CatalogStatus Status,
    DateOnly? SaleStartDate,
    DateOnly? SaleEndDate,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    IReadOnlyList<PackageItemDto> Items)
{
    public string? ShortDescription { get; init; }

    /// <summary>Sum of each item's current service price × its sessions: what the sessions cost bought one by one.</summary>
    public decimal RetailPrice { get; init; }
}
