using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>service_packages</c> (thesis: GoiDichVu). See docs/domain/data-model.md.</summary>
public sealed class ServicePackage : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int ValidityDays { get; set; }
    public CatalogStatus Status { get; set; }
    public DateOnly? SaleStartDate { get; set; }
    public DateOnly? SaleEndDate { get; set; }
    public ICollection<ServicePackageItem> Items { get; } = [];
}
