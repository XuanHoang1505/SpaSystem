using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>The appointment held by a book-now order (UC-SPA-15 flow 1), shown on the payment result page.</summary>
public sealed record OrderAppointmentDto(Guid Id, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, AppointmentStatus Status, AppointmentStaffDto Staff);
