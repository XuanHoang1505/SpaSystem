using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Promotions;

namespace NhuNguyetSpa.Application.Validators.Promotions;

public sealed class ChangePromotionStatusRequestValidator : AbstractValidator<ChangePromotionStatusRequest>
{
    public ChangePromotionStatusRequestValidator() =>
        RuleFor(request => request.Status).NotNull().IsInEnum().WithMessage("Trạng thái phải là active hoặc stopped.");
}
