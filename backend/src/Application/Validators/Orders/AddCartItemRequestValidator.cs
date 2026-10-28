using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Orders;

namespace NhuNguyetSpa.Application.Validators.Orders;

public sealed class AddCartItemRequestValidator : AbstractValidator<AddCartItemRequest>
{
    public AddCartItemRequestValidator() =>
        RuleFor(request => request)
            .Must(request => request.SpaServiceId is null != request.ServicePackageId is null)
            .OverridePropertyName("spaServiceId")
            .WithMessage("Chọn đúng một dịch vụ hoặc một gói dịch vụ.");
}
