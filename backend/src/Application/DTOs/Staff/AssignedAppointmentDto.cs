using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>One row of <c>GET /me/assigned-appointments</c>; the detail is <c>GET /appointments/{id}</c>.</summary>
public sealed record AssignedAppointmentDto(
    Guid Id,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    AppointmentStatus Status,
    AppointmentCustomerDto Customer,
    AppointmentServiceDto Service,
    TreatmentSessionRefDto? TreatmentSession,
    bool HasAllergies,
    bool HasSkinProfile);
