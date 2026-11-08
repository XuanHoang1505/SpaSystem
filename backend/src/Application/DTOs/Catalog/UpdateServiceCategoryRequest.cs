namespace NhuNguyetSpa.Application.DTOs.Catalog;

public sealed record UpdateServiceCategoryRequest(string Name, string? Description, int SortOrder, bool IsActive) : IServiceCategoryFields;
