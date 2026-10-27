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
    public CatalogStatus Status { get; private set; }
    public DateOnly? SaleStartDate { get; set; }
    public DateOnly? SaleEndDate { get; set; }
    public string? ImageUrl { get; private set; }
    public ICollection<ServicePackageItem> Items { get; } = [];

    /// <summary>Packages are never deleted, only discontinued (BR-CAT-03).</summary>
    public void ChangeStatus(CatalogStatus status) => Status = status;

    public void SetImage(string url)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        ImageUrl = url;
    }

    public void RemoveImage() => ImageUrl = null;

    /// <summary>Editing a package replaces its whole item list; nothing references package items, so old rows are deleted.</summary>
    public void ReplaceItems(IEnumerable<ServicePackageItem> items)
    {
        ArgumentNullException.ThrowIfNull(items);
        Items.Clear();
        foreach (var item in items)
            Items.Add(item);
    }
}
