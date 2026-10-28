namespace NhuNguyetSpa.Application.DTOs.WorkSchedules;

public sealed record CreateWorkScheduleBatchRequest(
    IReadOnlyList<Guid>? StaffMemberIds,
    DateOnly? FromDate,
    DateOnly? ToDate,
    IReadOnlyList<DayOfWeek>? Weekdays,
    TimeOnly? StartTime,
    TimeOnly? EndTime);
