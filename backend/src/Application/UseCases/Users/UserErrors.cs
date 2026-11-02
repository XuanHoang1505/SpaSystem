using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Users;

/// <summary>Error codes of UC-SPA-04/05 (docs/specs/auth.md). <c>phone_exists</c> comes from <c>AccountErrors</c>.</summary>
public static class UserErrors
{
    public const string UserNotFoundCode = "user_not_found";
    public const string CurrentPasswordIncorrectCode = "current_password_incorrect";
    public const string PasswordUnchangedCode = "password_unchanged";
    public const string CannotLockSelfCode = "cannot_lock_self";

    public static NotFoundException UserNotFound() => new("Không tìm thấy tài khoản.", UserNotFoundCode);

    public static BusinessRuleException CurrentPasswordIncorrect() => new("Mật khẩu hiện tại không đúng.", CurrentPasswordIncorrectCode);

    public static ConflictException CannotLockSelf() => new("Bạn không thể tự khóa tài khoản của mình.", CannotLockSelfCode);
}
