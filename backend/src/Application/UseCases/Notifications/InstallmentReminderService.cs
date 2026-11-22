using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
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
/// NTF-E17 (BR-INS-09): once per installment order, <c>Installment:ExpiryReminderDays</c> days before its package expires while an
/// installment is still unpaid. Runs on the appointment reminder job; the dedup key keeps a second scan from adding another.
/// </summary>
public sealed class InstallmentReminderService : IInstallmentReminderService
{
    private const int BatchSize = 200;

    private readonly IOrderRepository _orders;
    private readonly INotificationRepository _notifications;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<InstallmentOptions> _options;
    private readonly ILogger<InstallmentReminderService> _logger;

    public InstallmentReminderService(IOrderRepository orders, INotificationRepository notifications, IUnitOfWork unitOfWork,
        IDateTimeProvider clock, IOptions<InstallmentOptions> options, ILogger<InstallmentReminderService> logger)
    {
        _orders = orders;
        _notifications = notifications;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _options = options;
        _logger = logger;
    }

    public static string DedupKey(Guid orderId) => $"installment-expiry:{orderId}";

    public async Task<int> SendDueAsync(CancellationToken cancellationToken)
    {
        var days = _options.Value.ExpiryReminderDays;
        if (days <= 0)
            return 0;
        var now = _clock.UtcNow;
        var candidates = await _orders.GetInstallmentExpiryCandidatesAsync(now, now.AddDays(days), BatchSize, cancellationToken);
        var existing = await _notifications.GetExistingDedupKeysAsync(candidates.Select(item => DedupKey(item.OrderId)).ToList(),
            cancellationToken);
        var added = 0;
        foreach (var candidate in candidates.Where(item => !existing.Contains(DedupKey(item.OrderId))))
        {
            var content = NotificationTemplates.InstallmentExpirySoon(candidate.PackageName, SpaTime.Today(candidate.ExpiresAtUtc));
            await _notifications.AddAsync(Notification.Create(candidate.CustomerId, content.Type, content.Title, content.Body,
                new NotificationReference(NotificationReferenceType.Order, candidate.OrderId), DedupKey(candidate.OrderId), now),
                cancellationToken);
            added++;
        }
        if (added == 0)
            return 0;
        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (ConflictException exception) when (exception.Code == AppointmentReminderService.DuplicateCode)
        {
            _logger.LogInformation("Installment reminders already created by a concurrent scan; skipping this batch.");
            return 0;
        }
        return added;
    }
}
