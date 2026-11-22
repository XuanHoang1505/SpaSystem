namespace NhuNguyetSpa.Application.Interfaces.Services.Notifications;

/// <summary>NTF-E17 (BR-INS-09): called by the AppointmentReminderJob hosted service (and directly by tests).</summary>
public interface IInstallmentReminderService
{
    /// <summary>Adds and saves the package expiry reminders that are due now; returns how many were created.</summary>
    Task<int> SendDueAsync(CancellationToken cancellationToken);
}
