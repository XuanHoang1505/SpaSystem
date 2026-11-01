using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Treatments;

namespace NhuNguyetSpa.Application.Validators.Treatments;

public sealed class UpdateTreatmentSessionRequestValidator : AbstractValidator<UpdateTreatmentSessionRequest>
{
    public UpdateTreatmentSessionRequestValidator()
    {
        RuleFor(request => request.Note).MaximumLength(TreatmentLimits.MaxTextLength)
            .WithMessage($"Ghi chú tối đa {TreatmentLimits.MaxTextLength} ký tự.");
    }
}
