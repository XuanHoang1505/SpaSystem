namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>New Vietnam date and start time; the end keeps the appointment's length.</summary>
public sealed record RescheduleAppointmentRequest(DateOnly? Date, TimeOnly? StartTime);
