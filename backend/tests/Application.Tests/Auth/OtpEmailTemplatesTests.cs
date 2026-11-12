using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.Auth;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Auth;

/// <summary>BR-AUTH-12 (docs/specs/auth.md).</summary>
public sealed class OtpEmailTemplatesTests
{
    [Fact]
    public void RegistrationTemplateContainsOtpAndExpiry()
    {
        var message = OtpEmailTemplates.Create(OtpPurpose.Registration, "an@gmail.com", "Nguyễn Thị An", "042517", 5);

        message.ToEmail.Should().Be("an@gmail.com");
        message.ToName.Should().Be("Nguyễn Thị An");
        message.Subject.Should().Be("Mã xác thực đăng ký tài khoản – Spa Như Nguyệt");
        foreach (var body in new[] { message.HtmlBody, message.TextBody })
        {
            body.Should().Contain("042517").And.Contain("5 phút").And.Contain("Spa Như Nguyệt");
            body.Should().Contain("Không chia sẻ");
        }
    }

    [Fact]
    public void PasswordResetTemplateHasOwnSubject()
    {
        var message = OtpEmailTemplates.Create(OtpPurpose.PasswordReset, "an@gmail.com", "An", "123456", 5);

        message.Subject.Should().Be("Mã đặt lại mật khẩu – Spa Như Nguyệt");
        message.TextBody.Should().Contain("đặt lại mật khẩu");
    }

    [Fact]
    public void HtmlIsEmailClientSafe()
    {
        var html = OtpEmailTemplates.Create(OtpPurpose.Registration, "an@gmail.com", "An", "042517", 5).HtmlBody;

        html.Should().Contain("role=\"presentation\"", "table layout renders in Outlook and Gmail");
        html.Should().Contain("color-scheme", "declares light/dark support");
        html.Should().MatchRegex("display:none[^>]*>[^<]*042517", "the inbox preview line shows the code");
        html.Should().NotContain("<img").And.NotContain("http://").And.NotContain("https://", "no remote content that clients block");
    }

    [Theory]
    [InlineData(OtpPurpose.Registration, "Xác thực đăng ký tài khoản")]
    [InlineData(OtpPurpose.PasswordReset, "Đặt lại mật khẩu")]
    public void HtmlHasHeadingPerPurpose(OtpPurpose purpose, string heading) =>
        OtpEmailTemplates.Create(purpose, "an@gmail.com", "An", "042517", 5).HtmlBody.Should().Contain(heading);

    [Fact]
    public void HtmlEncodesRecipientName()
    {
        var message = OtpEmailTemplates.Create(OtpPurpose.Registration, "an@gmail.com", "<b>An</b>", "123456", 5);

        message.HtmlBody.Should().NotContain("<b>An</b>").And.Contain("&lt;b&gt;An&lt;/b&gt;");
    }
}
