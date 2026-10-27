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
    DateOnly? SaleEndDate);
