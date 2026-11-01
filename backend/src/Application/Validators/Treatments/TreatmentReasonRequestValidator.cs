using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Treatments;

namespace NhuNguyetSpa.Application.Validators.Treatments;

public sealed class TreatmentReasonRequestValidator : AbstractValidator<TreatmentReasonRequest>
{
    public TreatmentReasonRequestValidator()
    {
        RuleFor(request => request.Reason)
            .Must(reason => !string.IsNullOrWhiteSpace(reason) && reason.Trim().Length <= TreatmentLimits.MaxReasonLength)
            .WithMessage($"Vui lòng nhập lý do (tối đa {TreatmentLimits.MaxReasonLength} ký tự).");
    }
}
