using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Repositories;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>
/// Reads the customer's own appointment (UC-SPA-15/16) and fills its <c>canReschedule</c>/<c>canCancel</c> flags and change deadline
/// from <see cref="AppointmentChangePolicy"/>, so the detail, the list and the commands agree (BR-BKG-07).
/// </summary>
public sealed class MyAppointmentReader
{
    private readonly IAppointmentRepository _appointments;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<BookingOptions> _options;

    public MyAppointmentReader(IAppointmentRepository appointments, IDateTimeProvider clock, IOptions<BookingOptions> options)
    {
        _appointments = appointments;
        _clock = clock;
        _options = options;
    }

    /// <summary>Someone else's or a missing appointment → <c>404 appointment_not_found</c> (BR-SEC-01).</summary>
    public async Task<MyAppointmentDto> GetAsync(Guid id, Guid customerId, CancellationToken cancellationToken)
    {
        var row = await _appointments.GetMineAsync(id, customerId, cancellationToken) ?? throw BookingErrors.AppointmentNotFound();
        var (canReschedule, canCancel, deadline) = Flags(row.Facts);
        return row.Appointment with { CanReschedule = canReschedule, CanCancel = canCancel, ChangeDeadlineAtUtc = deadline };
    }

    public (bool CanReschedule, bool CanCancel, DateTime? DeadlineUtc) Flags(AppointmentChangeFacts facts)
    {
        ArgumentNullException.ThrowIfNull(facts);
        var nowUtc = _clock.UtcNow;
        var cutoff = _options.Value.CustomerChangeCutoffHours;
        var canCancel = AppointmentChangePolicy.CanChange(facts.Status, facts.Date, facts.StartTime, nowUtc, cutoff);
        return (canCancel && AppointmentChangePolicy.SourceAllowsReschedule(facts, nowUtc), canCancel,
            AppointmentChangePolicy.DeadlineUtc(facts.Status, facts.Date, facts.StartTime, cutoff));
    }
}
