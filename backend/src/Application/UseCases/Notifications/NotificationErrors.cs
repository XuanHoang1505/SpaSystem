using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Notifications;

public static class NotificationErrors
{
    public const string NotFoundCode = "notification_not_found";

    /// <summary>Missing or another user's notification (BR-NTF-04).</summary>
    public static NotFoundException NotFound() => new("Không tìm thấy thông báo.", NotFoundCode);
}
