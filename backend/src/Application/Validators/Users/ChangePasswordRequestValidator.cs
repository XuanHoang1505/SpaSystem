using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Application.UseCases.Users;
using NhuNguyetSpa.Application.Validators.Auth;

namespace NhuNguyetSpa.Application.Validators.Users;

/// <summary>BR-AUTH-16: the new password follows BR-AUTH-10 and differs from the current one.</summary>
public sealed class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator(IOptions<AccountOptions> options)
    {
        RuleFor(request => request.CurrentPassword).NotEmpty().WithMessage("Vui lòng nhập mật khẩu hiện tại.").MaximumLength(PasswordRules.MaxLength);
        RuleFor(request => request.NewPassword).Cascade(CascadeMode.Stop)
            .StrongPassword(options.Value.PasswordMinLength)
            .NotEqual(request => request.CurrentPassword, StringComparer.Ordinal)
            .WithMessage("Mật khẩu mới phải khác mật khẩu hiện tại.").WithErrorCode(UserErrors.PasswordUnchangedCode);
        RuleFor(request => request.ConfirmPassword).Equal(request => request.NewPassword).WithMessage("Mật khẩu xác nhận không khớp.");
    }
}
