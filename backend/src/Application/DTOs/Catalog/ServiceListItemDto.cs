using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

public sealed record ServiceListItemDto(Guid Id, string Name, Guid CategoryId, string Category, decimal Price, int DurationMinutes, string? ImageUrl, CatalogStatus Status)
{
    public string? ShortDescription { get; init; }
}
