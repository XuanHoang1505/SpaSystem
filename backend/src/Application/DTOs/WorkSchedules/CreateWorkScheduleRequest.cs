namespace NhuNguyetSpa.Application.DTOs.WorkSchedules;

/// <summary>Body of <c>POST /work-schedules</c>; date and times are Vietnam local time (ADR-0003).</summary>
public sealed record CreateWorkScheduleRequest(Guid? StaffMemberId, DateOnly? Date, TimeOnly? StartTime, TimeOnly? EndTime);
