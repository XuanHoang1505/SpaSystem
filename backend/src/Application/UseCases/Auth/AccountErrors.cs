using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Auth;

/// <summary>Error codes and user-facing messages for UC-SPA-01/03 (docs/specs/auth.md).</summary>
public static class AccountErrors
{
    public const string EmailExistsCode = "email_exists";
    public const string PhoneExistsCode = "phone_exists";
    public const string OtpInvalidCode = "otp_invalid";
    public const string OtpExpiredCode = "otp_expired";
    public const string OtpTooManyAttemptsCode = "otp_too_many_attempts";
    public const string RateLimitedCode = "rate_limited";
    public const string EmailSendFailedCode = "email_send_failed";
    public const string InvalidResetTokenCode = "invalid_reset_token";

    public static ConflictException EmailExists() => new("Email này đã được dùng cho một tài khoản khác.", EmailExistsCode);

    public static ConflictException PhoneExists() => new("Số điện thoại này đã được dùng cho một tài khoản khác.", PhoneExistsCode);

    public static BusinessRuleException OtpInvalid() => new("Mã OTP không đúng.", OtpInvalidCode);

    public static BusinessRuleException OtpExpired() => new("Mã OTP đã hết hạn, vui lòng yêu cầu mã mới.", OtpExpiredCode);

    public static BusinessRuleException OtpTooManyAttempts() =>
        new("Bạn đã nhập sai mã OTP quá số lần cho phép, vui lòng yêu cầu mã mới.", OtpTooManyAttemptsCode);

    public static TooManyRequestsException ResendTooSoon(int secondsToWait) =>
        new($"Vui lòng chờ {secondsToWait} giây trước khi yêu cầu mã mới.", RateLimitedCode);

    public static ServiceUnavailableException EmailSendFailed() =>
        new("Không gửi được email lúc này, vui lòng thử lại sau.", EmailSendFailedCode);

    public static BusinessRuleException InvalidResetToken() =>
        new("Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn, vui lòng làm lại từ đầu.", InvalidResetTokenCode);
}
