using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>customers</c> (thesis: KhachHang). See docs/domain/data-model.md.</summary>
public sealed class Customer : BaseEntity
{
    public User User { get; set; } = null!;
    public string? Note { get; set; }
}
