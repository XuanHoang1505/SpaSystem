using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>One row of <c>GET /appointments</c>; <see cref="Service"/> is derived from the appointment's source (BR-BKG-13).</summary>
public sealed record AppointmentListItemDto(
    Guid Id,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    AppointmentStatus Status,
    AppointmentCustomerDto Customer,
    AppointmentStaffDto Staff,
    AppointmentServiceDto Service);
