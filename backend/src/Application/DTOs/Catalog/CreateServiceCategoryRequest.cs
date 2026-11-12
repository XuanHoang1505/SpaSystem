namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary><see cref="SortOrder"/> defaults to 0 and <see cref="IsActive"/> to true.</summary>
public sealed record CreateServiceCategoryRequest(string Name, string? Description, int? SortOrder, bool? IsActive) : IServiceCategoryFields;
