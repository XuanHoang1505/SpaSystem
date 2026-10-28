namespace NhuNguyetSpa.Application.Interfaces.Notifications;

/// <summary>
/// Sends one email immediately. Any delivery or configuration failure surfaces as
/// <see cref="NhuNguyetSpa.Domain.Exceptions.ServiceUnavailableException"/> with code <c>email_send_failed</c>.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken);
}
