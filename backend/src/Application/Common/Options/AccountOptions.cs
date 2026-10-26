namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Account</c>: OTP and password rules for UC-SPA-01/03 (docs/specs/auth.md, BR-AUTH-07/09/10).</summary>
public sealed class AccountOptions
{
    public const string SectionName = "Account";

    public int OtpExpirationMinutes { get; set; } = 5;
    public int OtpMaxFailedAttempts { get; set; } = 5;
    public int OtpResendCooldownSeconds { get; set; } = 60;
    public int PasswordResetTokenExpirationMinutes { get; set; } = 10;
    public int PasswordMinLength { get; set; } = 8;
}
