using FluentValidation;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Application.Validators.Staff;

namespace NhuNguyetSpa.Application.Validators.Users;

public sealed class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator(IDateTimeProvider clock)
    {
        RuleFor(request => request.FullName).ProfileFullName();
        RuleFor(request => request.PhoneNumber).ProfilePhoneNumber();
        RuleFor(request => request.DateOfBirth).DateOfBirth(clock.Today());
        RuleFor(request => request.Gender).ProfileGender();
    }
}
