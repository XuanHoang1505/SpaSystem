using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using NhuNguyetSpa.Application.Interfaces.Notifications;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.IntegrationTests.Infrastructure;

/// <summary>Records mail instead of sending it, so tests can read the OTP; can be switched to fail like an SMTP outage.</summary>
public sealed partial class FakeEmailSender : IEmailSender
{
    private readonly ConcurrentQueue<EmailMessage> _sent = new();

    public bool Fail { get; set; }

    public IReadOnlyCollection<EmailMessage> Sent => _sent.ToArray();

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        if (Fail)
            throw new ServiceUnavailableException("Không gửi được email lúc này, vui lòng thử lại sau.", "email_send_failed");
        _sent.Enqueue(message);
        return Task.CompletedTask;
    }

    public IReadOnlyList<EmailMessage> SentTo(string email) =>
        _sent.Where(message => string.Equals(message.ToEmail, email, StringComparison.OrdinalIgnoreCase)).ToList();

    // Anchored on the template's "là: <otp>" so digits in the recipient's name are never mistaken for the code.
    public string LastOtpFor(string email) => OtpLine().Match(SentTo(email)[^1].TextBody).Groups[1].Value;

    /// <summary>The temporary password from the newest staff-account mail to <paramref name="email"/> (BR-STF-08).</summary>
    public string LastTemporaryPasswordFor(string email) => PasswordLine().Match(SentTo(email)[^1].TextBody).Groups[1].Value;

    [GeneratedRegex(@"là: (\d{6})")]
    private static partial Regex OtpLine();

    [GeneratedRegex(@"Mật khẩu tạm: (\S+)")]
    private static partial Regex PasswordLine();
}
