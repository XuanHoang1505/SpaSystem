namespace NhuNguyetSpa.Domain.Common;

public abstract class BaseAuditableEntity : BaseEntity, IHasCreatedAt
{
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
