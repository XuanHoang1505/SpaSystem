using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>reviews</c> (thesis: DanhGia). See docs/domain/data-model.md.</summary>
public sealed class Review : BaseAuditableEntity
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public Guid? SpaServiceId { get; set; }
    public SpaService? SpaService { get; set; }
    public Guid? ServicePackageId { get; set; }
    public ServicePackage? ServicePackage { get; set; }
    public string? Comment { get; set; }
    public string? OwnerReply { get; set; }
    public DateTime? RepliedAtUtc { get; set; }
    public int Rating { get; set; }
    public string? ImageUrl { get; set; }
    public ReviewStatus Status { get; set; }
}
