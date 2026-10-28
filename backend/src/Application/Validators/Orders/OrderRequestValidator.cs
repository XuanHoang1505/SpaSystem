using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Orders;

namespace NhuNguyetSpa.Application.Validators.Orders;

public sealed class OrderRequestValidator : AbstractValidator<OrderRequest>
{
    public const int MaxPromotionCodeLength = 50;

    public OrderRequestValidator()
    {
        RuleFor(request => request.Source).NotNull().IsInEnum().WithMessage("Nguồn đơn phải là cart hoặc buy_now.");
        RuleFor(request => request)
            .Must(request => request.SpaServiceId is null && request.ServicePackageId is null)
            .When(request => request.Source == OrderSource.Cart)
            .OverridePropertyName("spaServiceId")
            .WithMessage("Thanh toán giỏ hàng không kèm sản phẩm.");
        RuleFor(request => request)
            .Must(request => request.SpaServiceId is null != request.ServicePackageId is null)
            .When(request => request.Source == OrderSource.BuyNow)
            .OverridePropertyName("spaServiceId")
            .WithMessage("Mua ngay cần đúng một dịch vụ hoặc một gói dịch vụ.");
        RuleFor(request => request.PromotionCode)
            .Must(code => code is null || code.Trim().Length <= MaxPromotionCodeLength)
            .WithMessage($"Mã khuyến mãi tối đa {MaxPromotionCodeLength} ký tự.");
    }
}
