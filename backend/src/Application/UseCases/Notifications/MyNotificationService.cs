using Microsoft.Extensions.Logging;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Notifications;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Notifications;
using NhuNguyetSpa.Application.Mapping;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Notifications;

/// <summary>
/// UC-SPA-34 (BR-NTF-04, 09, 10). Every call works on the caller's own notifications; another user's reads as
/// <c>404 notification_not_found</c>. After a read is saved, the new unread count is pushed to the user's other connections.
/// </summary>
public sealed class MyNotificationService : IMyNotificationService
{
    private readonly INotificationRepository _notifications;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly INotificationRealtime _realtime;
    private readonly ILogger<MyNotificationService> _logger;

    public MyNotificationService(
        INotificationRepository notifications,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        INotificationRealtime realtime,
        ILogger<MyNotificationService> logger)
    {
        _notifications = notifications;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _realtime = realtime;
        _logger = logger;
    }

    private Guid UserId => _currentUser.UserId ?? throw new UnauthorizedException("Vui lòng đăng nhập.", "unauthorized");

    public async Task<OperationResult<PagedResult<NotificationDto>>> ListAsync(PagedQuery paging, NotificationListQuery query,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(paging);
        ArgumentNullException.ThrowIfNull(query);
        var page = await _notifications.ListForUserAsync(UserId, query.UnreadOnly, query.Type, paging, cancellationToken);
        return OperationResult<PagedResult<NotificationDto>>.Success(new PagedResult<NotificationDto>(
            page.Items.Select(notification => notification.ToDto()), page.PageNumber, page.PageSize, page.TotalCount));
    }

    public async Task<OperationResult<NotificationDto>> OpenAsync(Guid id, CancellationToken cancellationToken)
    {
        var notification = await ReadAsync(id, cancellationToken);
        return OperationResult<NotificationDto>.Success(notification.ToDto());
    }

    public async Task MarkReadAsync(Guid id, CancellationToken cancellationToken) => await ReadAsync(id, cancellationToken);

    public async Task MarkAllReadAsync(CancellationToken cancellationToken)
    {
        var userId = UserId;
        // ExecuteUpdate bypasses SaveChanges, so the count is pushed here rather than by the persistence interceptor.
        if (await _notifications.MarkAllReadAsync(userId, _clock.UtcNow, cancellationToken) > 0)
            await PushUnreadCountAsync(userId, cancellationToken);
    }

    public async Task<OperationResult<UnreadNotificationCountDto>> GetUnreadCountAsync(CancellationToken cancellationToken) =>
        OperationResult<UnreadNotificationCountDto>.Success(
            new UnreadNotificationCountDto(await _notifications.CountUnreadAsync(UserId, cancellationToken)));

    private async Task<Domain.Entities.Notification> ReadAsync(Guid id, CancellationToken cancellationToken)
    {
        var userId = UserId;
        var notification = await _notifications.GetForUserAsync(id, userId, cancellationToken) ?? throw NotificationErrors.NotFound();
        if (notification.MarkRead(_clock.UtcNow))
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await PushUnreadCountAsync(userId, cancellationToken);
        }

        return notification;
    }

    private async Task PushUnreadCountAsync(Guid userId, CancellationToken cancellationToken)
    {
        try
        {
            await _realtime.NotifyUnreadCountAsync(userId, await _notifications.CountUnreadAsync(userId, cancellationToken), cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // BR-NTF-10: the read is saved; clients resync the count when they reconnect.
            _logger.LogWarning(exception, "Could not push the unread notification count to user {UserId}.", userId);
        }
    }
}
