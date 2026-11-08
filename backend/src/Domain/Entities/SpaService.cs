using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>spa_services</c> (thesis: DichVu). See docs/domain/data-model.md.</summary>
public sealed class SpaService : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public ServiceCategory? Category { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; private set; }
    public CatalogStatus Status { get; private set; }

    /// <summary>Procedure steps ordered by <see cref="ServiceStep.SortOrder"/> (Q-71).</summary>
    public ICollection<ServiceStep> Steps { get; } = [];

    /// <summary>Services are never deleted, only discontinued (BR-CAT-03).</summary>
    public void ChangeStatus(CatalogStatus status) => Status = status;

    public void SetImage(string url)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        ImageUrl = url;
    }

    public void RemoveImage() => ImageUrl = null;
}
