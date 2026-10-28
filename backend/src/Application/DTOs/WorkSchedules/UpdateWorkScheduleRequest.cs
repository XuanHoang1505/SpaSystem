namespace NhuNguyetSpa.Application.DTOs.WorkSchedules;

public sealed record UpdateWorkScheduleRequest(
    DateOnly? Date,
    TimeOnly? StartTime,
    TimeOnly? EndTime);
