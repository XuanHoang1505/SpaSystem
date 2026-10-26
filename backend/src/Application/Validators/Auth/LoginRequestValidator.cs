using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Auth;

namespace NhuNguyetSpa.Application.Validators.Auth;

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(request => request.Login).NotEmpty().MaximumLength(255);
        RuleFor(request => request.Password).NotEmpty().MaximumLength(128);
    }
}
