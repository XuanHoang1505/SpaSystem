namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>
/// Filters of <c>GET /appointments</c> (paging and the customer name/phone <c>search</c> come from <c>PagedQuery</c>);
/// both dates are required and inclusive; <see cref="Status"/> is a snake_case appointment status.
/// </summary>
public sealed class AppointmentListQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public Guid? StaffMemberId { get; set; }
    public string? Status { get; set; }
}
