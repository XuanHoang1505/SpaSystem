using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

/// <summary>
/// BR-BKG-13, the one place that derives an appointment's service: the treatment session's service, else the service bought
/// on the entitlement's order line, else the service on the appointment's own order line (book now). <c>ck_appointments_source</c>
/// guarantees one of them exists.
/// </summary>
internal static class AppointmentServiceSource
{
    public static IQueryable<AppointmentWithService> WithService(this IQueryable<Appointment> appointments, AppDbContext context) =>
        from appointment in appointments
        let serviceId = appointment.TreatmentSessionId != null
            ? (Guid?)appointment.TreatmentSession!.SpaServiceId
            : appointment.ServiceEntitlementId != null
                ? appointment.ServiceEntitlement!.OrderItem.SpaServiceId
                : appointment.OrderItem!.SpaServiceId
        join service in context.SpaServices on serviceId equals (Guid?)service.Id
        select new AppointmentWithService { Appointment = appointment, Service = service };
}

internal sealed class AppointmentWithService
{
    public required Appointment Appointment { get; init; }
    public required SpaService Service { get; init; }
}
