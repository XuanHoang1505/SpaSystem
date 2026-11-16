using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Notifications;
using NhuNguyetSpa.Application.Interfaces.Services.Notifications;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>UC-SPA-34: the signed-in user's notifications (docs/specs/notifications.md). The user is always the caller.</summary>
[Route("api/v1/me/notifications")]
[Authorize(Policy = Permissions.NotificationSelf)]
public sealed class MyNotificationsController : ApiController
{
    private readonly IMyNotificationService _notifications;

    public MyNotificationsController(IMyNotificationService notifications) => _notifications = notifications;

    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResult<NotificationDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> List([FromQuery] PagedQuery paging, [FromQuery] NotificationListQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _notifications.ListAsync(paging, query, cancellationToken));

    [HttpGet("unread-count")]
    [ProducesResponseType<ApiResponse<UnreadNotificationCountDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> UnreadCount(CancellationToken cancellationToken) =>
        HandleResult(await _notifications.GetUnreadCountAsync(cancellationToken));

    /// <summary>Opens a notification and records the first read (DA: opening writes DocLuc).</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<NotificationDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Open(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _notifications.OpenAsync(id, cancellationToken));

    /// <summary>Marks one notification read without returning it (Q-82).</summary>
    [HttpPost("{id:guid}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        await _notifications.MarkReadAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("read-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ReadAll(CancellationToken cancellationToken)
    {
        await _notifications.MarkAllReadAsync(cancellationToken);
        return NoContent();
    }
}
