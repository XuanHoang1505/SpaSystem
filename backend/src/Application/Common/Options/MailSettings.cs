namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>
/// Section <c>MailSettings</c> (<c>MAIL_SETTINGS_*</c> in .env). <c>Mail</c> and <c>Password</c> (a Gmail App Password)
/// are secrets and come only from .env; they are checked when a mail is sent, not at startup.
/// </summary>
public sealed class MailSettings
{
    public const string SectionName = "MailSettings";

    public string Mail { get; set; } = string.Empty;
    public string DisplayName { get; set; } = "Spa Như Nguyệt";
    public string Password { get; set; } = string.Empty;
    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public int TimeoutSeconds { get; set; } = 30;
}
