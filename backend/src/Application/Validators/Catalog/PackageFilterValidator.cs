using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

public sealed class PackageFilterValidator : AbstractValidator<PackageFilter>
{
    public PackageFilterValidator()
    {
        RuleFor(filter => filter.MinPrice).OptionalVndAmount();
        RuleFor(filter => filter.MaxPrice).OptionalVndAmount()
            .Must((filter, max) => filter.MinPrice is null || max is null || max >= filter.MinPrice)
            .WithMessage("Giá đến phải lớn hơn hoặc bằng giá từ.");
    }
}
