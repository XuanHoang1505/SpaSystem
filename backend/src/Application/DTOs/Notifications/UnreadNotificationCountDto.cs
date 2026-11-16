namespace NhuNguyetSpa.Application.DTOs.Notifications;

/// <summary>The bell badge: how many notifications the user has not read (the client shows "99+").</summary>
public sealed record UnreadNotificationCountDto(int Count);
