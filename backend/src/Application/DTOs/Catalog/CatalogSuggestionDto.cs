namespace NhuNguyetSpa.Application.DTOs.Catalog;

public sealed record CatalogSuggestionDto(CatalogItemType Type, Guid Id, string Name, string? ImageUrl);
