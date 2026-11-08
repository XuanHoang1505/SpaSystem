using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

public sealed class UpdateServiceCategoryRequestValidator : AbstractValidator<UpdateServiceCategoryRequest>
{
    public UpdateServiceCategoryRequestValidator()
    {
        Include(new ServiceCategoryFieldsValidator());
        RuleFor(request => request.SortOrder).InclusiveBetween(0, ServiceCategoryFieldsValidator.MaxSortOrder)
            .WithMessage($"Thứ tự hiển thị phải từ 0 đến {ServiceCategoryFieldsValidator.MaxSortOrder}.");
    }
}
