using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Auth;

namespace NhuNguyetSpa.Application.Validators.Auth;

public sealed class GoogleSignInRequestValidator : AbstractValidator<GoogleSignInRequest>
{
    public GoogleSignInRequestValidator()
    {
        RuleFor(request => request.IdToken).NotEmpty().WithMessage("Thiếu thông tin đăng nhập Google.").MaximumLength(4096);
    }
}
