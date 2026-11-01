namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>
/// Query string of <c>GET /availability</c>: exactly one of <see cref="SpaServiceId"/>, <see cref="ServiceEntitlementId"/> or
/// <see cref="TreatmentSessionId"/> (the last two for a signed-in customer, UC-SPA-15 flow 2), or only <see cref="AppointmentId"/> to
/// reschedule it (the owner, or a customer for their own appointment, UC-SPA-16 BR-BKG-18). A guest's <see cref="AppointmentId"/> next to
/// a source is ignored.
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
