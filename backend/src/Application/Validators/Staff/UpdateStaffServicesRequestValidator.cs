using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Staff;

namespace NhuNguyetSpa.Application.Validators.Staff;

public sealed class UpdateStaffServicesRequestValidator : AbstractValidator<UpdateStaffServicesRequest>
{
    public UpdateStaffServicesRequestValidator() => RuleFor(request => request.SpaServiceIds).SpaServiceIds();
}
