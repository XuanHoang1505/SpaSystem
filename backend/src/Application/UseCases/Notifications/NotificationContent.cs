using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Notifications;

/// <summary>The group, title and body of one notification (BR-NTF-05).</summary>
public sealed record NotificationContent(NotificationType Type, string Title, string Body);
