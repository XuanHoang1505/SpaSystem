using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Mapping;

internal static class CatalogMappings
{
    public static ServiceDetailDto ToDetailDto(this SpaService service, IEnumerable<ServiceStep> steps) => new(
        service.Id, service.Name, service.CategoryId, service.Category?.Name ?? string.Empty, service.Description, service.Price, service.DurationMinutes, service.ImageUrl,
        service.Status, service.CreatedAtUtc, service.UpdatedAtUtc)
    {
        ShortDescription = service.ShortDescription,
        Steps = steps.OrderBy(step => step.SortOrder).Select(ToDto).ToList(),
    };

    public static ServiceStepDto ToDto(this ServiceStep step) => new(step.SortOrder, step.Title, step.Description, step.DurationMinutes);

    public static ServiceCategoryDto ToDto(this ServiceCategory category, int serviceCount) => new(
        category.Id, category.Name, category.Description, category.SortOrder, category.IsActive, serviceCount);

    public static string? TrimToNull(this string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
