namespace NhuNguyetSpa.Application.Interfaces.Services.Notifications;

/// <summary>BR-NTF-06: called by the AppointmentReminderJob hosted service (and directly by tests).</summary>
public interface IAppointmentReminderService
{
    /// <summary>Adds and saves the reminders that are due now; returns how many were created.</summary>
    Task<int> SendDueAsync(CancellationToken cancellationToken);
}
