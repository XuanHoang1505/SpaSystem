namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>
/// Filters of <c>GET /me/appointments</c> (paging from <c>PagedQuery</c>): <see cref="Scope"/> is <c>upcoming</c>, <c>past</c> or
/// <c>cancelled</c>, <see cref="Status"/> a snake_case appointment status; all optional, dates inclusive.
/// </summary>
public sealed class MyAppointmentListQuery
{
    public string? Scope { get; set; }
    public string? Status { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
}
