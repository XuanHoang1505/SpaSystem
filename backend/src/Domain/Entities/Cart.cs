using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>carts</c> (thesis: GioHang). See docs/domain/data-model.md.</summary>
public sealed class Cart : BaseAuditableEntity
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public ICollection<CartItem> Items { get; } = [];
}
