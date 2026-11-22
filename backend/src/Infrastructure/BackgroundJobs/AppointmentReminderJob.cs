using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Services.Notifications;

namespace NhuNguyetSpa.Infrastructure.BackgroundJobs;

/// <summary>
/// Hosted service for BR-NTF-06: every <c>Notifications:ReminderJob:IntervalSeconds</c> it adds the appointment reminders that are
/// due, and the package expiry reminders of installment orders (NTF-E17). Off when <c>ReminderJob:Enabled</c> is false; each kind
/// is also off when its own setting is 0. A failed scan is logged and retried next time; it never stops the API.
/// </summary>
public sealed class AppointmentReminderJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly IOptions<NotificationOptions> _options;
    private readonly ILogger<AppointmentReminderJob> _logger;

    public AppointmentReminderJob(IServiceScopeFactory scopes, IOptions<NotificationOptions> options, ILogger<AppointmentReminderJob> logger)
    {
        _scopes = scopes;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var options = _options.Value;
        if (!options.ReminderJob.Enabled)
            return;

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(options.ReminderJob.IntervalSeconds));
        do
        {
            try
            {
                await using var scope = _scopes.CreateAsyncScope();
                var sent = await scope.ServiceProvider.GetRequiredService<IAppointmentReminderService>().SendDueAsync(stoppingToken);
                if (sent > 0)
                    _logger.LogInformation("Created {Count} appointment reminders.", sent);
                var expiring = await scope.ServiceProvider.GetRequiredService<IInstallmentReminderService>().SendDueAsync(stoppingToken);
                if (expiring > 0)
                    _logger.LogInformation("Created {Count} installment expiry reminders.", expiring);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Appointment reminder scan failed; retrying on the next tick.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
