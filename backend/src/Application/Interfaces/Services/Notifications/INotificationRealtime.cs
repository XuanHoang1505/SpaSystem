using NhuNguyetSpa.Application.DTOs.Notifications;

namespace NhuNguyetSpa.Application.Interfaces.Services.Notifications;

/// <summary>
/// Pushes to the user's open connections (BR-NTF-09). Only called after the data is committed (BR-NTF-10); callers swallow and log
/// failures because the database stays the source of truth.
/// </summary>
public interface INotificationRealtime
{
    Task NotifyCreatedAsync(Guid userId, NotificationDto notification, CancellationToken cancellationToken);

    Task NotifyUnreadCountAsync(Guid userId, int count, CancellationToken cancellationToken);
}
