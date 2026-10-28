using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Promotions;
using NhuNguyetSpa.Application.UseCases.Promotions;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Validators.Promotions;

/// <summary>BR-PRM-04, 05. Runs on the normalized code; "ends in the future" is checked by the service on create only.</summary>
public sealed class SavePromotionRequestValidator : AbstractValidator<SavePromotionRequest>
{
    public const decimal MaxFixedAmount = 999_999_999m;
    public const decimal MaxOrderAmount = 999_999_999_999m;
    public const int MaxDescriptionLength = 1000;
    public const int MaxPerCustomerLimit = 1000;
    public const int MaxUsageLimit = 1_000_000;

    public SavePromotionRequestValidator()
    {
        RuleFor(request => request.Code)
            .NotEmpty().WithMessage("Vui lòng nhập mã khuyến mãi.")
            .Matches(PromotionCode.Pattern).WithMessage("Mã gồm 3–50 ký tự chữ cái không dấu, chữ số, dấu gạch ngang hoặc gạch dưới.");
        RuleFor(request => request.Description).MaximumLength(MaxDescriptionLength).WithMessage($"Mô tả tối đa {MaxDescriptionLength} ký tự.");
        RuleFor(request => request.DiscountType).NotNull().IsInEnum().WithMessage("Hình thức giảm phải là percentage hoặc fixed_amount.");
        RuleFor(request => request.DiscountValue).NotNull().WithMessage("Vui lòng nhập giá trị giảm.");
        RuleFor(request => request.DiscountValue)
            .Must(value => value is > 0 and <= 100 && value * 100 == decimal.Truncate(value.Value * 100))
            .WithMessage("Phần trăm giảm từ 0,01 đến 100, tối đa 2 chữ số thập phân.")
            .When(request => request.DiscountType == DiscountType.Percentage && request.DiscountValue is not null);
        RuleFor(request => request.DiscountValue)
            .Must(value => value is >= 1 and <= MaxFixedAmount && value == decimal.Truncate(value.Value))
            .WithMessage("Số tiền giảm là số nguyên từ 1 đến 999.999.999 đồng.")
            .When(request => request.DiscountType == DiscountType.FixedAmount && request.DiscountValue is not null);
        RuleFor(request => request.MinOrderAmount)
            .NotNull().WithMessage("Vui lòng nhập giá trị đơn tối thiểu.")
            .Must(value => value is not { } amount || amount is >= 0 and <= MaxOrderAmount && amount == decimal.Truncate(amount))
            .WithMessage("Giá trị đơn tối thiểu là số nguyên từ 0 đến 999.999.999.999 đồng.");
        RuleFor(request => request.MaxDiscountAmount)
            .Must(value => value is null || value >= 1 && value <= MaxOrderAmount && value == decimal.Truncate(value.Value))
            .WithMessage("Số tiền giảm tối đa là số nguyên từ 1 đồng.");
        RuleFor(request => request.MaxDiscountAmount)
            .Null().When(request => request.DiscountType == DiscountType.FixedAmount)
            .WithMessage("Chỉ khuyến mãi theo phần trăm mới có số tiền giảm tối đa.");
        RuleFor(request => request.StartsAtUtc).NotNull().WithMessage("Vui lòng nhập thời điểm bắt đầu.");
        RuleFor(request => request.EndsAtUtc).NotNull().WithMessage("Vui lòng nhập thời điểm kết thúc.");
        RuleFor(request => request.EndsAtUtc)
            .GreaterThan(request => request.StartsAtUtc).WithMessage("Thời điểm kết thúc phải sau thời điểm bắt đầu.")
            .When(request => request.StartsAtUtc is not null && request.EndsAtUtc is not null);
        RuleFor(request => request.PerCustomerLimit)
            .InclusiveBetween(1, MaxPerCustomerLimit).When(request => request.PerCustomerLimit is not null)
            .WithMessage($"Số lần mỗi khách từ 1 đến {MaxPerCustomerLimit}.");
        RuleFor(request => request.UsageLimit)
            .InclusiveBetween(1, MaxUsageLimit).When(request => request.UsageLimit is not null)
            .WithMessage($"Tổng số lượt từ 1 đến {MaxUsageLimit:N0}.");
    }
}
