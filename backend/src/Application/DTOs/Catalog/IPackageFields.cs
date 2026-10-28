namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary>Fields shared by the create and update package requests, validated once by <c>PackageFieldsValidator</c>.</summary>
public interface IPackageFields
{
    string Name { get; }
    string? Description { get; }
    decimal Price { get; }
    int ValidityDays { get; }
    DateOnly? SaleStartDate { get; }
    DateOnly? SaleEndDate { get; }
    IReadOnlyList<PackageItemRequest>? Items { get; }
}
