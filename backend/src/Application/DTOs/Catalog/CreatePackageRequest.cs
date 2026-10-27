using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary><see cref="Status"/> defaults to on_sale.</summary>
public sealed record CreatePackageRequest(
    string Name,
    string? Description,
    decimal Price,
    int ValidityDays,
    DateOnly? SaleStartDate,
    DateOnly? SaleEndDate,
    CatalogStatus? Status,
    IReadOnlyList<PackageItemRequest>? Items) : IPackageFields;
