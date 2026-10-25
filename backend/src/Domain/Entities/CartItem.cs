using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>cart_items</c> (thesis: ChiTietGioHang). See docs/domain/data-model.md.</summary>
public sealed class CartItem : BaseEntity
{
    public Guid CartId { get; set; }
    public Cart Cart { get; set; } = null!;
    public Guid? SpaServiceId { get; set; }
    public SpaService? SpaService { get; set; }
    public Guid? ServicePackageId { get; set; }
    public ServicePackage? ServicePackage { get; set; }
    public decimal UnitPrice { get; set; }
    public DateTime AddedAtUtc { get; set; }
}
