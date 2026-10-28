using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Auth;

/// <summary>Error codes and user-facing messages from docs/specs/auth.md (E1–E6).</summary>
public static class AuthErrors
{
    public const string InvalidCredentialsCode = "invalid_credentials";
    public const string AccountLockedCode = "account_locked";
    public const string AccountInactiveCode = "account_inactive";
    public const string InvalidRefreshTokenCode = "invalid_refresh_token";

    public static UnauthorizedException InvalidCredentials() =>
        new("Email/số điện thoại hoặc mật khẩu không đúng.", InvalidCredentialsCode);

    public static UnauthorizedException InvalidRefreshToken() =>
        new("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", InvalidRefreshTokenCode);

    public static ForbiddenException NotActive(UserStatus status) => status == UserStatus.Locked
        ? new ForbiddenException("Tài khoản đã bị khóa. Vui lòng liên hệ spa.", AccountLockedCode)
        : new ForbiddenException("Tài khoản đã ngừng hoạt động.", AccountInactiveCode);
}
