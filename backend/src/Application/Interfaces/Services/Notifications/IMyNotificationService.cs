using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Notifications;

namespace NhuNguyetSpa.Application.Interfaces.Services.Notifications;

/// <summary>UC-SPA-34: the signed-in user's notifications (docs/specs/notifications.md). The user is always the caller.</summary>
public interface IMyNotificationService
{
    Task<OperationResult<PagedResult<NotificationDto>>> ListAsync(PagedQuery paging, NotificationListQuery query, CancellationToken cancellationToken);

    /// <summary>Returns the notification and records the first read (BR-NTF-04).</summary>
    Task<OperationResult<NotificationDto>> OpenAsync(Guid id, CancellationToken cancellationToken);

    Task MarkReadAsync(Guid id, CancellationToken cancellationToken);

    Task MarkAllReadAsync(CancellationToken cancellationToken);

    Task<OperationResult<UnreadNotificationCountDto>> GetUnreadCountAsync(CancellationToken cancellationToken);
}
