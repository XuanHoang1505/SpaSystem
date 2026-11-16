using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using NhuNguyetSpa.API.Authorization;

namespace NhuNguyetSpa.API.Realtime;

/// <summary>
/// BR-NTF-09: server → client only. Each connection belongs to the user of its access token (the default user id provider reads the
/// <c>sub</c> claim, mapped to NameIdentifier). Events: <see cref="NotificationCreated"/>, <see cref="UnreadCountChanged"/>.
/// </summary>
[Authorize(Policy = Permissions.NotificationSelf)]
public sealed class NotificationHub : Hub
{
    public const string Path = "/hubs/notifications";
    public const string NotificationCreated = "notificationCreated";
    public const string UnreadCountChanged = "unreadCountChanged";
}
