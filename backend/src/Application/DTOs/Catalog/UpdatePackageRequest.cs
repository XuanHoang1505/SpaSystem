namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary><see cref="Items"/> replaces the whole item list.</summary>
public sealed record UpdatePackageRequest(
    string Name,
    string? Description,
    decimal Price,
    int ValidityDays,
    DateOnly? SaleStartDate,
    DateOnly? SaleEndDate,
    IReadOnlyList<PackageItemRequest>? Items) : IPackageFields;
