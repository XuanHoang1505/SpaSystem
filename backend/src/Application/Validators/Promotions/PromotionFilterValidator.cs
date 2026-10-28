using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Promotions;

namespace NhuNguyetSpa.Application.Validators.Promotions;

public sealed class PromotionFilterValidator : AbstractValidator<PromotionFilter>
{
    public PromotionFilterValidator()
    {
        RuleFor(filter => filter.Status)
            .Must(status => PromotionQuery.TryParseStatus(status, out _))
            .WithMessage("Trạng thái phải là active hoặc stopped.");
        RuleFor(filter => filter.ToDate)
            .GreaterThanOrEqualTo(filter => filter.FromDate)
            .When(filter => filter.FromDate is not null && filter.ToDate is not null)
            .WithMessage("Ngày kết thúc lọc không được trước ngày bắt đầu.");
    }
}
