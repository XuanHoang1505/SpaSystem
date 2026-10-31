namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>Filters of <c>GET /me/assigned-appointments</c> (UC-SPA-25): both dates required and inclusive; snake_case status.</summary>
public sealed class AssignedAppointmentQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public string? Status { get; set; }
}
