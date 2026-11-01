using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Treatments;

namespace NhuNguyetSpa.Application.Validators.Treatments;

public sealed class UpdateTreatmentPlanRequestValidator : AbstractValidator<UpdateTreatmentPlanRequest>
{
    public UpdateTreatmentPlanRequestValidator()
    {
        RuleFor(request => request.Goal).MaximumLength(TreatmentLimits.MaxTextLength)
            .WithMessage($"Mục tiêu tối đa {TreatmentLimits.MaxTextLength} ký tự.");
        RuleFor(request => request.Note).MaximumLength(TreatmentLimits.MaxTextLength)
            .WithMessage($"Ghi chú tối đa {TreatmentLimits.MaxTextLength} ký tự.");
    }
}
