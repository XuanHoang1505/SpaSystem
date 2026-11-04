using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Notifications;
using NhuNguyetSpa.Domain.Exceptions;
using NhuNguyetSpa.Infrastructure.Notifications;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Notifications;

public sealed class SmtpEmailSenderTests
{
    private static readonly EmailMessage Message = new("an@gmail.com", "An", "Tiêu đề", "<p>Nội dung</p>", "Nội dung");

    [Theory]
    [InlineData("", "app-password")]
    [InlineData("spa@gmail.com", "")]
    public async Task MissingCredentialsThrowsServiceUnavailable(string mail, string password)
    {
        var sender = Create(new MailSettings { Mail = mail, Password = password });

        var act = () => sender.SendAsync(Message, CancellationToken.None);

        (await act.Should().ThrowAsync<ServiceUnavailableException>()).Which.Code.Should().Be("email_send_failed");
    }

    [Fact]
    public async Task UnreachableHostThrowsServiceUnavailable()
    {
        var sender = Create(new MailSettings { Mail = "spa@gmail.com", Password = "secret-app-password", Host = "127.0.0.1", Port = 1, TimeoutSeconds = 2 });

        var act = () => sender.SendAsync(Message, CancellationToken.None);

        var error = (await act.Should().ThrowAsync<ServiceUnavailableException>()).Which;
        error.Code.Should().Be("email_send_failed");
        error.Message.Should().NotContain("secret-app-password").And.NotContain("127.0.0.1");
    }

    [Theory]
    [InlineData("an nguyen@gmail.com", "spa@gmail.com")]
    [InlineData("an@gmail.com", "spa @gmail.com")]
    public async Task UnparsableAddressThrowsServiceUnavailable(string to, string from)
    {
        var sender = Create(new MailSettings { Mail = from, Password = "secret-app-password", Host = "127.0.0.1", Port = 1, TimeoutSeconds = 2 });

        var act = () => sender.SendAsync(Message with { ToEmail = to }, CancellationToken.None);

        (await act.Should().ThrowAsync<ServiceUnavailableException>()).Which.Code.Should().Be("email_send_failed");
    }

    [Theory]
    [InlineData("nguyenan@gmail.com", "n***@gmail.com")]
    [InlineData("a@spa.vn", "a***@spa.vn")]
    [InlineData("khong-co-a-cong", "***")]
    public void MaskHidesLocalPart(string email, string expected) => EmailAddressMask.Mask(email).Should().Be(expected);

    private static SmtpEmailSender Create(MailSettings settings) =>
        new(Options.Create(settings), NullLogger<SmtpEmailSender>.Instance);
}
