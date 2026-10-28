using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Notifications;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Infrastructure.Notifications;

/// <summary>
/// Sends mail through SMTP (Gmail: smtp.gmail.com:587 with STARTTLS and an App Password).
/// Settings are read per send, so missing MAIL_SETTINGS_* only breaks the endpoints that send mail.
/// </summary>
public sealed class SmtpEmailSender : IEmailSender
{
    private const string FailureCode = "email_send_failed";
    private const string FailureMessage = "Không gửi được email lúc này, vui lòng thử lại sau.";

    private readonly IOptions<MailSettings> _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<MailSettings> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options;
        _logger = logger;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(message);
        var settings = _options.Value;
        if (string.IsNullOrWhiteSpace(settings.Mail) || string.IsNullOrWhiteSpace(settings.Password))
        {
            _logger.LogError("Mail is not configured: set MAIL_SETTINGS_MAIL and MAIL_SETTINGS_PASSWORD in .env");
            throw new ServiceUnavailableException(FailureMessage, FailureCode);
        }

        try
        {
            // Built inside the try: an address MimeKit cannot parse is a delivery failure (503), not a crash (500).
            var mime = new MimeMessage();
            mime.From.Add(new MailboxAddress(settings.DisplayName, settings.Mail));
            mime.To.Add(new MailboxAddress(message.ToName, message.ToEmail));
            mime.Subject = message.Subject;
            mime.Body = new BodyBuilder { HtmlBody = message.HtmlBody, TextBody = message.TextBody }.ToMessageBody();

            using var client = new SmtpClient { Timeout = settings.TimeoutSeconds * 1000 };
            var security = settings.Port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
            await client.ConnectAsync(settings.Host, settings.Port, security, cancellationToken);
            await client.AuthenticateAsync(settings.Mail, settings.Password, cancellationToken);
            await client.SendAsync(mime, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
            _logger.LogInformation("Sent email to {Recipient}", EmailAddressMask.Mask(message.ToEmail));
        }
        catch (Exception exception) when (exception is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            // MailKit exceptions never include the password; the message is logged, not returned to the client.
            _logger.LogError("Sending email to {Recipient} failed: {ErrorType}: {ErrorMessage}",
                EmailAddressMask.Mask(message.ToEmail), exception.GetType().Name, exception.Message);
            throw new ServiceUnavailableException(FailureMessage, FailureCode);
        }
    }
}
