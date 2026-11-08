using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>service_categories</c> (DanhMucDichVu, Q-13). See docs/domain/data-model.md.</summary>
public sealed class ServiceCategory : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }

    /// <summary>Hidden categories leave the guest filter; their services stay visible (BR-CAT-12).</summary>
    public bool IsActive { get; set; } = true;
}
