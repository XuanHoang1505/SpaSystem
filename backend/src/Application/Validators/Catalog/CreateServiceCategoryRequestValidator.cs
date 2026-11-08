using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

public sealed class CreateServiceCategoryRequestValidator : AbstractValidator<CreateServiceCategoryRequest>
{
    public CreateServiceCategoryRequestValidator()
    {
        Include(new ServiceCategoryFieldsValidator());
        RuleFor(request => request.SortOrder)
            .Must(order => order is null or >= 0 and <= ServiceCategoryFieldsValidator.MaxSortOrder)
            .WithMessage($"Thứ tự hiển thị phải từ 0 đến {ServiceCategoryFieldsValidator.MaxSortOrder}.");
    }
}
