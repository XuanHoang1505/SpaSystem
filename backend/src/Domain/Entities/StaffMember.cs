using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>staff_members</c> (thesis: NhanVien). See docs/domain/data-model.md.</summary>
public sealed class StaffMember : BaseEntity
{
    public User User { get; set; } = null!;
    public DateOnly HireDate { get; set; }
    public string? Specialty { get; set; }
    public DateOnly? ResignationDate { get; set; }
    public ICollection<StaffSkill> Skills { get; } = [];
}
