namespace NhuNguyetSpa.Application.DTOs.WorkSchedules;

public sealed record WorkScheduleBatchResultDto(IReadOnlyList<WorkScheduleDto> Created, IReadOnlyList<SkippedShiftDto> Skipped);
