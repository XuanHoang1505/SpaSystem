using FluentValidation;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Validators.Auth;

namespace NhuNguyetSpa.Application.Validators.Staff;

public sealed class CreateStaffRequestValidator : AbstractValidator<CreateStaffRequest>
{
    public CreateStaffRequestValidator(IDateTimeProvider clock)
    {
        RuleFor(request => request.FullName).StaffFullName();
        RuleFor(request => request.Email).AccountEmail();
        RuleFor(request => request.PhoneNumber).StaffPhoneNumber();
        RuleFor(request => request.HireDate).HireDate(clock.Today());
        RuleFor(request => request.Specialty).StaffSpecialty();
        RuleFor(request => request.SpaServiceIds).SpaServiceIds();
    }
}
