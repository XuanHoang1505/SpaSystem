using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

public sealed record ServiceListItemDto(Guid Id, string Name, string Category, decimal Price, int DurationMinutes, string? ImageUrl, CatalogStatus Status);
