namespace NhuNguyetSpa.Application.DTOs.Staff;

public sealed record ResignationResultDto(StaffDetailDto Staff, IReadOnlyList<AppointmentToReassignDto> AppointmentsToReassign);
