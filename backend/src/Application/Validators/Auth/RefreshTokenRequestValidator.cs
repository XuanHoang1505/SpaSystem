using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Auth;

namespace NhuNguyetSpa.Application.Validators.Auth;

public sealed class RefreshTokenRequestValidator : AbstractValidator<RefreshTokenRequest>
{
    public RefreshTokenRequestValidator() => RuleFor(request => request.RefreshToken).NotEmpty().MaximumLength(200);
}
