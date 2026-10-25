using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>work_schedules</c> (thesis: LichLamViec). See docs/domain/data-model.md.</summary>
public sealed class WorkSchedule : BaseEntity
{
    public Guid StaffMemberId { get; set; }
    public StaffMember StaffMember { get; set; } = null!;
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public WorkScheduleStatus Status { get; set; }
}
