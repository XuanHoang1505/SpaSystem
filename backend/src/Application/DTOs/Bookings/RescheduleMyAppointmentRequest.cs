namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>Body of <c>POST /me/appointments/{id}/reschedule</c> (UC-SPA-16 A1); no staff member = any staff (Q-26).</summary>
public sealed record RescheduleMyAppointmentRequest(DateOnly? Date, TimeOnly? StartTime, Guid? StaffMemberId);
