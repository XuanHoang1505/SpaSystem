using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary><see cref="Status"/> defaults to on_sale; <see cref="Steps"/> left out means no steps.</summary>
public sealed record CreateServiceRequest(string Name, Guid CategoryId, string? Description, int DurationMinutes, decimal Price, CatalogStatus? Status)
    : IServiceFields
{
    public string? ShortDescription { get; init; }
    public IReadOnlyList<ServiceStepRequest>? Steps { get; init; }
}
