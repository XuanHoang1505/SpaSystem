using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

public sealed record ServiceDetailDto(
    Guid Id,
    string Name,
    string Category,
    string? Description,
    decimal Price,
    int DurationMinutes,
    string? ImageUrl,
    CatalogStatus Status,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);
