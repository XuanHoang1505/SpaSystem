using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>promotion_redemptions</c> (thesis: ApDungKhuyenMai). See docs/domain/data-model.md.</summary>
public sealed class PromotionRedemption : BaseEntity
{
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public Guid PromotionId { get; set; }
    public Promotion Promotion { get; set; } = null!;
    public string PromotionCode { get; set; } = string.Empty;
    public decimal DiscountAmount { get; set; }
    public DateTime RedeemedAtUtc { get; set; }
}
