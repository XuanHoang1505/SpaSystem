using NhuNguyetSpa.Application.DTOs.Notifications;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Mapping;

public static class NotificationMappings
{
    public static NotificationDto ToDto(this Notification notification)
    {
        ArgumentNullException.ThrowIfNull(notification);
        return new NotificationDto(notification.Id, notification.Type, notification.Title, notification.Body, notification.ReferenceType,
            notification.ReferenceId, notification.ReadAtUtc is not null, notification.ReadAtUtc, notification.CreatedAtUtc);
    }
}
