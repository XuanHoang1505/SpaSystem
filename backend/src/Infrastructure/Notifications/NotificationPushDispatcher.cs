using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Notifications;
using NhuNguyetSpa.Application.Mapping;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Notifications;

/// <summary>
/// BR-NTF-09/10: pushes committed notifications and each recipient's new unread count. Counts are read in a fresh scope so the
/// DbContext that just committed is never re-entered from its own interceptor. Failures are logged only.
/// </summary>
public sealed class NotificationPushDispatcher
{
    private readonly IServiceScopeFactory _scopes;
    private readonly INotificationRealtime _realtime;
    private readonly ILogger<NotificationPushDispatcher> _logger;

    public NotificationPushDispatcher(IServiceScopeFactory scopes, INotificationRealtime realtime, ILogger<NotificationPushDispatcher> logger)
    {
        _scopes = scopes;
        _realtime = realtime;
        _logger = logger;
    }

    public async Task DispatchAsync(IReadOnlyList<Notification> notifications, CancellationToken cancellationToken)
    {
        if (notifications.Count == 0)
            return;
        try
        {
            foreach (var notification in notifications)
                await _realtime.NotifyCreatedAsync(notification.UserId, notification.ToDto(), cancellationToken);

            await using var scope = _scopes.CreateAsyncScope();
            var repository = scope.ServiceProvider.GetRequiredService<INotificationRepository>();
            foreach (var userId in notifications.Select(notification => notification.UserId).Distinct())
                await _realtime.NotifyUnreadCountAsync(userId, await repository.CountUnreadAsync(userId, cancellationToken), cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // The notifications are committed; clients resync the count when they reconnect.
            _logger.LogWarning(exception, "Could not push {Count} notifications in realtime.", notifications.Count);
        }
    }
}
