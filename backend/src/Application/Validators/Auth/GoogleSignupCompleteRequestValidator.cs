using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Auth;

namespace NhuNguyetSpa.Application.Validators.Auth;

/// <summary>Same name and phone rules as the email registration (<see cref="RegisterRequestValidator"/>).</summary>
public sealed class GoogleSignupCompleteRequestValidator : AbstractValidator<GoogleSignupCompleteRequest>
{
    public GoogleSignupCompleteRequestValidator()
    {
        RuleFor(request => request.SignupToken).NotEmpty().WithMessage("Phiên đăng ký Google không hợp lệ.").MaximumLength(4096);
        RuleFor(request => request.FullName).Must(name => !string.IsNullOrWhiteSpace(name)).WithMessage("Vui lòng nhập họ tên.")
            .MaximumLength(100);
        RuleFor(request => request.PhoneNumber).Matches(@"^0\d{9}$").WithMessage("Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.");
    }
}
