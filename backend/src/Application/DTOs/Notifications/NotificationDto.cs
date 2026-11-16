using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Notifications;

/// <summary>One notification of the signed-in user (UC-SPA-34); also the payload of the realtime <c>notificationCreated</c> event.</summary>
public sealed record NotificationDto(
    Guid Id,
    NotificationType Type,
    string Title,
    string Body,
    NotificationReferenceType? ReferenceType,
    Guid? ReferenceId,
    bool IsRead,
    DateTime? ReadAtUtc,
    DateTime CreatedAtUtc);
