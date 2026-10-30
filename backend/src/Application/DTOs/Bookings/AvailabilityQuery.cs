namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>Query string of <c>GET /availability</c>; <see cref="AppointmentId"/> is read only for the owner (rescheduling).</summary>
public sealed class AvailabilityQuery
{
    public AvailabilityQuery()
    {
    }

    public AvailabilityQuery(Guid? spaServiceId, DateOnly? date, Guid? staffMemberId, Guid? appointmentId)
    {
        SpaServiceId = spaServiceId;
        Date = date;
        StaffMemberId = staffMemberId;
        AppointmentId = appointmentId;
    }

    public Guid? SpaServiceId { get; set; }
    public DateOnly? Date { get; set; }
    public Guid? StaffMemberId { get; set; }
    public Guid? AppointmentId { get; set; }
}
