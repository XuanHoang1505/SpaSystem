using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.DTOs.Care;

/// <summary>Response of <c>POST /appointments/{id}/complete</c>; <see cref="PackageProgress"/> only for a package session.</summary>
public sealed record CompleteAppointmentResult(AppointmentDetailDto Appointment, PackageProgressDto? PackageProgress);
