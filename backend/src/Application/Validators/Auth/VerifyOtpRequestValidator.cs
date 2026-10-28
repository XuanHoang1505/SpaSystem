using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Auth;

namespace NhuNguyetSpa.Application.Validators.Auth;

public sealed class VerifyOtpRequestValidator : AbstractValidator<VerifyOtpRequest>
{
    public VerifyOtpRequestValidator()
    {
        RuleFor(request => request.Email).AccountEmail();
        RuleFor(request => request.Otp).Matches(@"^\d{6}$").WithMessage("Mã OTP gồm 6 chữ số.");
    }
}
