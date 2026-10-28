using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary><see cref="Status"/> defaults to on_sale.</summary>
public sealed record CreateServiceRequest(string Name, string Category, string? Description, int DurationMinutes, decimal Price, CatalogStatus? Status)
    : IServiceFields;
