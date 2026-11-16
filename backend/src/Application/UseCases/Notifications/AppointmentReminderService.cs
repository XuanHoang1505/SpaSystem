using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Notifications;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NhuNguyetSpa.Domain.ValueObjects;

namespace NhuNguyetSpa.Application.UseCases.Notifications;

/// <summary>
/// NTF-E08 / BR-NTF-06: one in-app reminder per confirmed appointment start time, <c>Notifications:AppointmentReminderHoursBefore</c>
/// hours ahead. The dedup key makes a second scan (or a second API instance) add nothing; a moved appointment gets a new key.
/// </summary>
public sealed class AppointmentReminderService : IAppointmentReminderService
{
    public const string DuplicateCode = "notification_exists";

    private readonly INotificationRepository _notifications;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<NotificationOptions> _options;
    private readonly ILogger<AppointmentReminderService> _logger;

    public AppointmentReminderService(INotificationRepository notifications, IUnitOfWork unitOfWork, IDateTimeProvider clock,
        IOptions<NotificationOptions> options, ILogger<AppointmentReminderService> logger)
    {
        _notifications = notifications;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _options = options;
        _logger = logger;
    }

    public async Task<int> SendDueAsync(CancellationToken cancellationToken)
    {
        var hours = _options.Value.AppointmentReminderHoursBefore;
        if (hours <= 0)
            return 0;
        var batchSize = _options.Value.ReminderJob.BatchSize;
        var now = _clock.UtcNow;
        var (from, to) = ReminderWindow.Days(now, hours);
        var created = 0;
        for (var skip = 0; ; skip += batchSize)
        {
            var page = await _notifications.GetReminderCandidatesAsync(from, to, skip, batchSize, cancellationToken);
            var due = page
                .Where(candidate => ReminderWindow.IsDue(candidate.Date, candidate.StartTime, now, hours) &&
                                    !ReminderWindow.BookedInsideWindow(candidate.CreatedAtUtc,
                                        ReminderWindow.StartUtc(candidate.Date, candidate.StartTime), hours))
                .Select(candidate => (Candidate: candidate, Key: ReminderWindow.DedupKey(candidate.AppointmentId, candidate.Date, candidate.StartTime)))
                .ToList();
            var existing = await _notifications.GetExistingDedupKeysAsync(due.Select(item => item.Key).ToList(), cancellationToken);
            var added = 0;
            foreach (var (candidate, key) in due.Where(item => !existing.Contains(item.Key)))
            {
                var content = NotificationTemplates.Reminder(candidate.ServiceName, candidate.Date, candidate.StartTime, candidate.IsPackageSession);
                await _notifications.AddAsync(Notification.Create(candidate.CustomerId, content.Type, content.Title, content.Body,
                    new NotificationReference(NotificationReferenceType.Appointment, candidate.AppointmentId), key, now), cancellationToken);
                added++;
            }

            if (added > 0)
            {
                try
                {
                    await _unitOfWork.SaveChangesAsync(cancellationToken);
                }
                catch (ConflictException exception) when (exception.Code == DuplicateCode)
                {
                    // Another instance sent the same reminders between our read and our save; the next scan sees them.
                    _logger.LogInformation("Reminders already created by a concurrent scan; skipping this batch.");
                    return created;
                }

                created += added;
            }

            if (page.Count < batchSize)
                return created;
        }
    }
}
