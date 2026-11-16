using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Notifications;

/// <summary>Filters of <c>GET /me/notifications</c> (A1, A3); an unknown <c>type</c> fails model binding with 400 validation_error.</summary>
public sealed class NotificationListQuery
{
    public bool UnreadOnly { get; set; }

    public NotificationType? Type { get; set; }
}
