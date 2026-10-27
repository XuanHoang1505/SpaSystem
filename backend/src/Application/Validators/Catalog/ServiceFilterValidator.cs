using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

public sealed class ServiceFilterValidator : AbstractValidator<ServiceFilter>
{
    public ServiceFilterValidator()
    {
        RuleFor(filter => filter.Category).MaximumLength(100).WithMessage("Loại dịch vụ tối đa 100 ký tự.");
        RuleFor(filter => filter.MinPrice).OptionalVndAmount();
        RuleFor(filter => filter.MaxPrice).OptionalVndAmount()
            .Must((filter, max) => filter.MinPrice is null || max is null || max >= filter.MinPrice)
            .WithMessage("Giá đến phải lớn hơn hoặc bằng giá từ.");
    }
}
