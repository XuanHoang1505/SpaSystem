using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

public sealed record PackageItemDto(
    Guid SpaServiceId,
    string ServiceName,
    string? ServiceImageUrl,
    CatalogStatus ServiceStatus,
    int SessionCount,
    int SortOrder,
    int MinDaysBetweenSessions,
    string? Note);
