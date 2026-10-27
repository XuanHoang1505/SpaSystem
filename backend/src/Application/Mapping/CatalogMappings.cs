using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Mapping;

internal static class CatalogMappings
{
    public static ServiceDetailDto ToDetailDto(this SpaService service) => new(
        service.Id, service.Name, service.Category, service.Description, service.Price, service.DurationMinutes, service.ImageUrl,
        service.Status, service.CreatedAtUtc, service.UpdatedAtUtc);

    public static string? TrimToNull(this string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
