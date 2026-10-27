using FluentValidation;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.DTOs.Staff;

namespace NhuNguyetSpa.Application.Validators.Staff;

/// <summary>The lower bound (hire date) needs the stored staff member, so the service checks it (BR-STF-01).</summary>
public sealed class ResignStaffRequestValidator : AbstractValidator<ResignStaffRequest>
{
    public ResignStaffRequestValidator(IDateTimeProvider clock)
    {
        var today = clock.Today();
        RuleFor(request => request.ResignationDate)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Vui lòng nhập ngày nghỉ việc.")
            .Must(date => date <= today.AddDays(StaffRules.MaxDaysAhead))
            .WithMessage($"Ngày nghỉ việc tối đa {StaffRules.MaxDaysAhead} ngày tới.");
    }
}
