namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>Body of <c>POST /me/appointments</c> (UC-SPA-15 flow 2): exactly one of a bought service or a package session.</summary>
public sealed record BookAppointmentRequest(
    Guid? ServiceEntitlementId, Guid? TreatmentSessionId, DateOnly? Date, TimeOnly? StartTime, Guid? StaffMemberId);
