using Microsoft.AspNetCore.SignalR;
using NhuNguyetSpa.Application.DTOs.Notifications;
using NhuNguyetSpa.Application.Interfaces.Services.Notifications;

namespace NhuNguyetSpa.API.Realtime;

/// <summary>The SignalR adapter of <see cref="INotificationRealtime"/>: one message to every open connection of the user.</summary>
public sealed class SignalRNotificationRealtime : INotificationRealtime
{
    private readonly IHubContext<NotificationHub> _hub;

    public SignalRNotificationRealtime(IHubContext<NotificationHub> hub) => _hub = hub;

    public Task NotifyCreatedAsync(Guid userId, NotificationDto notification, CancellationToken cancellationToken) =>
        _hub.Clients.User(userId.ToString()).SendAsync(NotificationHub.NotificationCreated, notification, cancellationToken);

    public Task NotifyUnreadCountAsync(Guid userId, int count, CancellationToken cancellationToken) =>
        _hub.Clients.User(userId.ToString()).SendAsync(NotificationHub.UnreadCountChanged, new UnreadNotificationCountDto(count),
            cancellationToken);
}
