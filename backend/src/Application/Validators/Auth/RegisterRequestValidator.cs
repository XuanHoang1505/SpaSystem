using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Auth;

namespace NhuNguyetSpa.Application.Validators.Auth;

public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator(IOptions<AccountOptions> options)
    {
        RuleFor(request => request.FullName).Must(name => !string.IsNullOrWhiteSpace(name)).WithMessage("Vui lòng nhập họ tên.")
            .MaximumLength(100);
        RuleFor(request => request.Email).AccountEmail();
        // Stored exactly as entered so login by phone (exact match) works: 0 followed by 9 digits.
        RuleFor(request => request.PhoneNumber).Matches(@"^0\d{9}$").WithMessage("Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.");
        RuleFor(request => request.Password).StrongPassword(options.Value.PasswordMinLength);
        RuleFor(request => request.ConfirmPassword).Equal(request => request.Password).WithMessage("Mật khẩu xác nhận không khớp.");
    }
}
