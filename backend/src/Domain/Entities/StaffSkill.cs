namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>staff_skills</c> (thesis: NhanVien_DichVu). See docs/domain/data-model.md.</summary>
public sealed class StaffSkill
{
    public Guid StaffMemberId { get; set; }
    public StaffMember StaffMember { get; set; } = null!;
    public Guid SpaServiceId { get; set; }
    public SpaService SpaService { get; set; } = null!;
}
