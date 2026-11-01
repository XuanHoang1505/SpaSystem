using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Orders;

namespace NhuNguyetSpa.Application.Validators.Orders;

public sealed class CancelOrderRequestValidator : AbstractValidator<CancelOrderRequest>
{
    public const int MaxReasonLength = 500;

    public CancelOrderRequestValidator()
    {
        RuleFor(request => request.Reason)
            .Cascade(CascadeMode.Stop)
            .Must(reason => !string.IsNullOrWhiteSpace(reason)).WithMessage("Vui lòng nhập lý do hủy.")
            .Must(reason => reason!.Trim().Length <= MaxReasonLength).WithMessage($"Lý do hủy tối đa {MaxReasonLength} ký tự.");
    }
}
