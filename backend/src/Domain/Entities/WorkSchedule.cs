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
    public WorkScheduleStatus Status { get; private set; }

    public static WorkSchedule Create(Guid staffMemberId, DateOnly date, TimeOnly startTime, TimeOnly endTime)
    {
        EnsureRange(startTime, endTime);
        return new WorkSchedule
        {
            Id = Guid.NewGuid(),
            StaffMemberId = staffMemberId,
            Date = date,
            StartTime = startTime,
            EndTime = endTime,
            Status = WorkScheduleStatus.Active,
        };
    }

    public void Reschedule(DateOnly date, TimeOnly startTime, TimeOnly endTime)
    {
        if (Status == WorkScheduleStatus.Cancelled)
            throw new InvalidOperationException("A cancelled shift cannot be changed.");
        EnsureRange(startTime, endTime);
        Date = date;
        StartTime = startTime;
        EndTime = endTime;
    }

    /// <summary>Cancelled is final (WF-12); cancelling again changes nothing.</summary>
    public void Cancel() => Status = WorkScheduleStatus.Cancelled;

    private static void EnsureRange(TimeOnly startTime, TimeOnly endTime)
    {
        if (endTime <= startTime)
            throw new ArgumentException("The shift must end after it starts.", nameof(endTime));
    }
}
