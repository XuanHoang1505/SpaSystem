namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>How a customer's appointment was booked (UC-SPA-15): a bought service, a package session, or book now (order line).</summary>
public enum AppointmentBookingSource
{
    Entitlement,
    Session,
    BookNow,
}
