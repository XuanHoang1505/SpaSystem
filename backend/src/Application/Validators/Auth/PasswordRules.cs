using FluentValidation;

namespace NhuNguyetSpa.Application.Validators.Auth;

/// <summary>BR-AUTH-10: shared field rules for registration and password reset.</summary>
public static class PasswordRules
{
    public const int MaxLength = 128;

    public static IRuleBuilderOptions<T, string> StrongPassword<T>(this IRuleBuilder<T, string> rule, int minLength) => rule
        .NotEmpty().WithMessage("Vui lòng nhập mật khẩu.")
        .Length(minLength, MaxLength).WithMessage($"Mật khẩu phải có từ {minLength} đến {MaxLength} ký tự.")
        .Must(password => password.Any(char.IsLetter) && password.Any(char.IsDigit))
        .WithMessage("Mật khẩu phải có ít nhất một chữ cái và một chữ số.");

    public static IRuleBuilderOptions<T, string> AccountEmail<T>(this IRuleBuilder<T, string> rule) => rule
        .NotEmpty().WithMessage("Vui lòng nhập email.")
        .MaximumLength(255)
        // Stricter than EmailAddress(): no spaces, exactly one '@', a dot in the domain, so the mail library can always parse it.
        .Matches(@"^[^\s@]+@[^\s@]+\.[^\s@]+$").WithMessage("Email không hợp lệ.");
}
