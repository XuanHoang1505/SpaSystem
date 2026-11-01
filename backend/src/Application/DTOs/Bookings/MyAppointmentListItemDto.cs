using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>One row of <c>GET /me/appointments</c> (UC-SPA-16); the flags mean the same as in <see cref="MyAppointmentDto"/>.</summary>
public sealed record MyAppointmentListItemDto(
    Guid Id,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    AppointmentStatus Status,
    DateTime? HoldExpiresAtUtc,
    AppointmentServiceDto Service,
    AppointmentStaffDto Staff,
    AppointmentBookingSource Source,
    MyTreatmentSessionRefDto? TreatmentSession)
{
    public bool CanReschedule { get; init; }
    public bool CanCancel { get; init; }
}
