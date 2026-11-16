using NhuNguyetSpa.Application.DTOs.Notifications;
using NhuNguyetSpa.Application.Interfaces.Services.Notifications;

namespace NhuNguyetSpa.Application.UseCases.Notifications;

/// <summary>Default when no realtime channel is wired (hosts other than the API); the API replaces it with SignalR.</summary>
public sealed class NullNotificationRealtime : INotificationRealtime
{
    public Task NotifyCreatedAsync(Guid userId, NotificationDto notification, CancellationToken cancellationToken) => Task.CompletedTask;

    public Task NotifyUnreadCountAsync(Guid userId, int count, CancellationToken cancellationToken) => Task.CompletedTask;
}
