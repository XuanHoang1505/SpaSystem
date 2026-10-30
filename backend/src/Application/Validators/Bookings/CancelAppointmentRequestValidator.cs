using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.Validators.Bookings;

public sealed class CancelAppointmentRequestValidator : AbstractValidator<CancelAppointmentRequest>
{
    public const int MaxReasonLength = 500;

    public CancelAppointmentRequestValidator()
    {
        RuleFor(request => request.Reason)
            .Cascade(CascadeMode.Stop)
            .Must(reason => !string.IsNullOrWhiteSpace(reason)).WithMessage("Vui lòng nhập lý do hủy.")
            .Must(reason => reason!.Trim().Length <= MaxReasonLength).WithMessage($"Lý do hủy tối đa {MaxReasonLength} ký tự.");
    }
}
