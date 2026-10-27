using FluentValidation;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.DTOs.Staff;

namespace NhuNguyetSpa.Application.Validators.Staff;

public sealed class UpdateStaffRequestValidator : AbstractValidator<UpdateStaffRequest>
{
    public UpdateStaffRequestValidator(IDateTimeProvider clock)
    {
        RuleFor(request => request.FullName).StaffFullName();
        RuleFor(request => request.PhoneNumber).StaffPhoneNumber();
        RuleFor(request => request.HireDate).HireDate(clock.Today());
        RuleFor(request => request.Specialty).StaffSpecialty();
    }
}
