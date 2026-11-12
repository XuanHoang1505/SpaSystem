namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary>
/// A service category (Q-13). <see cref="ServiceCount"/>: on_sale services for guests, every service for the owner.
/// </summary>
public sealed record ServiceCategoryDto(Guid Id, string Name, string? Description, int SortOrder, bool IsActive, int ServiceCount);
