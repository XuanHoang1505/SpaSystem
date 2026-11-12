using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.WorkSchedules;

/// <summary>Query string of <c>GET /me/work-schedules</c> (UC-SPA-24): both dates required; <see cref="Status"/> is active | cancelled.</summary>
public sealed class MyWorkScheduleQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public string? Status { get; set; }
}

/// <summary>One shift of the signed-in staff member with the number of appointments inside it (BR-STF-11).</summary>
public sealed record MyWorkScheduleDto(
    Guid Id, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, WorkScheduleStatus Status, int AppointmentCount);

/// <summary><c>GET /me/work-schedules/{id}</c>: the shift and the staff member's appointments inside it, by start time.</summary>
public sealed record MyWorkScheduleDetailDto(
    Guid Id,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    WorkScheduleStatus Status,
    IReadOnlyList<ShiftAppointmentDto> Appointments);

/// <summary>An appointment inside a shift (BR-STF-11).</summary>
public sealed record ShiftAppointmentDto(
    Guid Id,
    TimeOnly StartTime,
    TimeOnly EndTime,
    AppointmentStatus Status,
    AppointmentCustomerDto Customer,
    AppointmentServiceDto Service,
    TreatmentSessionRefDto? TreatmentSession);
