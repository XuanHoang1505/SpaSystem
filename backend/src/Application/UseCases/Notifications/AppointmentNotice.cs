using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.UseCases.Notifications;

/// <summary>
/// What a notification needs to know about an appointment, taken from the in-memory entity before saving (a new appointment is
/// not in the database yet). The service is derived by the caller (BR-BKG-13).
/// </summary>
public sealed record AppointmentNotice(
    Guid AppointmentId,
    Guid CustomerId,
    Guid StaffMemberId,
    Guid SpaServiceId,
    bool IsPackageSession,
    DateOnly Date,
    TimeOnly StartTime)
{
    /// <summary>A snapshot of the appointment as it is in memory now.</summary>
    public static AppointmentNotice Of(Appointment appointment, Guid spaServiceId)
    {
        ArgumentNullException.ThrowIfNull(appointment);
        return new AppointmentNotice(appointment.Id, appointment.CustomerId, appointment.StaffMemberId, spaServiceId,
            appointment.TreatmentSessionId is not null, appointment.Date, appointment.StartTime);
    }
}
