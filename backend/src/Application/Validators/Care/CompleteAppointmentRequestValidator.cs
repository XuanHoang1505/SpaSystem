using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Care;

namespace NhuNguyetSpa.Application.Validators.Care;

public sealed class CompleteAppointmentRequestValidator : AbstractValidator<CompleteAppointmentRequest>
{
    public const int MaxResultLength = 2000;

    public CompleteAppointmentRequestValidator()
    {
        RuleFor(request => request.Result).MaximumLength(MaxResultLength).WithMessage($"Kết quả chăm sóc tối đa {MaxResultLength} ký tự.");
    }
}
