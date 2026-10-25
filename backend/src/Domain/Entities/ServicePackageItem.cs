using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>service_package_items</c> (thesis: GoiDichVuChiTiet). See docs/domain/data-model.md.</summary>
public sealed class ServicePackageItem : BaseEntity
{
    public Guid SpaServiceId { get; set; }
    public SpaService SpaService { get; set; } = null!;
    public Guid ServicePackageId { get; set; }
    public ServicePackage ServicePackage { get; set; } = null!;
    public int SessionCount { get; set; }
    public int MinDaysBetweenSessions { get; set; }
    public int SortOrder { get; set; }
    public string? Note { get; set; }
}
