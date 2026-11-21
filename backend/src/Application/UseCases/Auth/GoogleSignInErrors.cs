using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Auth;

/// <summary>Error codes and user-facing messages of sign-in with Google (docs/specs/auth.md, Q-84).</summary>
public static class GoogleSignInErrors
{
    public const string TokenInvalidCode = "google_token_invalid";
    public const string EmailUnverifiedCode = "google_email_unverified";
    public const string NotAllowedCode = "google_sign_in_not_allowed";
    public const string SignupTokenInvalidCode = "google_signup_token_invalid";
    public const string AccountConflictCode = "google_account_conflict";
    public const string UnavailableCode = "google_sign_in_unavailable";

    public static UnauthorizedException TokenInvalid() =>
        new("Không xác thực được tài khoản Google, vui lòng thử lại.", TokenInvalidCode);

    public static BusinessRuleException EmailUnverified() =>
        new("Email của tài khoản Google chưa được xác minh.", EmailUnverifiedCode);

    public static ForbiddenException NotAllowed() =>
        new("Tài khoản này không đăng nhập bằng Google được, vui lòng đăng nhập bằng mật khẩu.", NotAllowedCode);

    public static BusinessRuleException SignupTokenInvalid() =>
        new("Phiên đăng ký bằng Google đã hết hạn, vui lòng đăng nhập bằng Google lại.", SignupTokenInvalidCode);

    public static ConflictException AccountConflict() =>
        new("Email này đã liên kết với một tài khoản Google khác.", AccountConflictCode);

    public static ServiceUnavailableException Unavailable() =>
        new("Đăng nhập bằng Google đang tạm ngưng, vui lòng đăng nhập bằng mật khẩu.", UnavailableCode);
}
