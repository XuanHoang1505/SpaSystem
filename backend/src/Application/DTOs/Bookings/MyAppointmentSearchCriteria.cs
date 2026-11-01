using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>Parsed <c>GET /me/appointments</c> filters for the repository; a null scope means every status.</summary>
public sealed record MyAppointmentSearchCriteria(
    MyAppointmentScope? Scope, AppointmentStatus? Status, DateOnly? FromDate, DateOnly? ToDate, int PageNumber, int PageSize);
