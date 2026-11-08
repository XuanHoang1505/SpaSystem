using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

public sealed record ServiceDetailDto(
    Guid Id,
    string Name,
    Guid CategoryId,
    string Category,
    string? Description,
    decimal Price,
    int DurationMinutes,
    string? ImageUrl,
    CatalogStatus Status,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc)
{
    public string? ShortDescription { get; init; }

    /// <summary>Procedure steps ordered by sort order (Q-71); empty when none.</summary>
    public IReadOnlyList<ServiceStepDto> Steps { get; init; } = [];
}
