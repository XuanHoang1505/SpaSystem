using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>service_steps</c> (BuocDichVu, Q-71): one step of a service's procedure. See docs/domain/data-model.md.</summary>
public sealed class ServiceStep : BaseEntity
{
    public Guid SpaServiceId { get; set; }
    public int SortOrder { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? DurationMinutes { get; set; }
}
