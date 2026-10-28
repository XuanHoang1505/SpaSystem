namespace NhuNguyetSpa.Application.DTOs.WorkSchedules;

public sealed record SkippedShiftDto(
    Guid StaffMemberId,
    string StaffName,
    DateOnly Date,
    string Reason);
