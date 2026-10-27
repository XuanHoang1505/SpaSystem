using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>staff_members</c> (thesis: NhanVien). See docs/domain/data-model.md.</summary>
public sealed class StaffMember : BaseEntity
{
    public User User { get; set; } = null!;
    public DateOnly HireDate { get; set; }
    public string? Specialty { get; set; }
    public DateOnly? ResignationDate { get; private set; }
    public ICollection<StaffSkill> Skills { get; } = [];

    public void Resign(DateOnly date)
    {
        if (ResignationDate is not null)
            throw new InvalidOperationException("The resignation date is already recorded.");
        if (date < HireDate)
            throw new InvalidOperationException("The resignation date cannot be before the hire date.");
        ResignationDate = date;
    }

    public bool IsWorkingOn(DateOnly day) => ResignationDate is null || day < ResignationDate;

    public void ReplaceSkills(IEnumerable<Guid> spaServiceIds)
    {
        var wanted = spaServiceIds.ToHashSet();
        foreach (var skill in Skills.Where(skill => !wanted.Contains(skill.SpaServiceId)).ToList())
            Skills.Remove(skill);
        foreach (var spaServiceId in wanted.Except(Skills.Select(skill => skill.SpaServiceId)).ToList())
            Skills.Add(new StaffSkill { StaffMemberId = Id, SpaServiceId = spaServiceId });
    }
}
