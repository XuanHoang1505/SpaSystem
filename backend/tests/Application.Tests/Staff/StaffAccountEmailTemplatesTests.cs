using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.Staff;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Staff;

/// <summary>BR-STF-08 credentials mail (STF-T02c).</summary>
public sealed class StaffAccountEmailTemplatesTests
{
    [Fact]
    public void MailHasSubjectLoginAndPassword()
    {
        var message = StaffAccountEmailTemplates.Create("an@spa.vn", "Nguyễn An", "Ab3dEf7hJk9m");

        message.ToEmail.Should().Be("an@spa.vn");
        message.ToName.Should().Be("Nguyễn An");
        message.Subject.Should().Be("Tài khoản nhân viên – Spa Như Nguyệt");
        message.TextBody.Should().Contain("Email đăng nhập: an@spa.vn")
            .And.Contain("Mật khẩu tạm: Ab3dEf7hJk9m")
            .And.Contain("Quên mật khẩu")
            .And.Contain("Không chia sẻ");
        message.HtmlBody.Should().Contain("an@spa.vn").And.Contain("Ab3dEf7hJk9m").And.Contain("Quên mật khẩu");
    }

    [Fact]
    public void MailHtmlEncodesName()
    {
        var message = StaffAccountEmailTemplates.Create("an@spa.vn", "<b>An</b>", "Ab3dEf7hJk9m");

        message.HtmlBody.Should().NotContain("<b>An</b>").And.Contain("&lt;b&gt;An&lt;/b&gt;");
    }
}
