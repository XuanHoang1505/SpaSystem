using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Auth;

namespace NhuNguyetSpa.Application.Validators.Auth;

public sealed class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator(IOptions<AccountOptions> options)
    {
        RuleFor(request => request.ResetToken).NotEmpty().MaximumLength(2000);
        RuleFor(request => request.NewPassword).StrongPassword(options.Value.PasswordMinLength);
        RuleFor(request => request.ConfirmPassword).Equal(request => request.NewPassword).WithMessage("Mật khẩu xác nhận không khớp.");
    }
}
