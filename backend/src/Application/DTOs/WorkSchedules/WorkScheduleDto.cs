using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.WorkSchedules;

public sealed record WorkScheduleDto(
    Guid Id,
    Guid StaffMemberId,
    string StaffName,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    WorkScheduleStatus Status);
