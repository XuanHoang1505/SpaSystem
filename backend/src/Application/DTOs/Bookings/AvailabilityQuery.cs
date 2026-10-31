namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>
/// Query string of <c>GET /availability</c>: exactly one of <see cref="SpaServiceId"/>, <see cref="ServiceEntitlementId"/> or
/// <see cref="TreatmentSessionId"/> (the last two for a signed-in customer, UC-SPA-15 flow 2); <see cref="AppointmentId"/> is read only
/// for the owner (rescheduling).
/// </summary>
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
    public Guid? ServiceEntitlementId { get; set; }
    public Guid? TreatmentSessionId { get; set; }
}
