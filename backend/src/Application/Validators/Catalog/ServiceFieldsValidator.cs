using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

public sealed class ServiceFieldsValidator : AbstractValidator<IServiceFields>
{
    public ServiceFieldsValidator()
    {
        RuleFor(request => request.Name).RequiredText(150, "tên dịch vụ");
        RuleFor(request => request.Category).RequiredText(100, "loại dịch vụ");
        RuleFor(request => request.Description).MaximumLength(CatalogRules.MaxDescriptionLength)
            .WithMessage($"Mô tả tối đa {CatalogRules.MaxDescriptionLength} ký tự.");
        RuleFor(request => request.DurationMinutes).InclusiveBetween(1, 1440).WithMessage("Thời lượng phải từ 1 đến 1440 phút.");
        RuleFor(request => request.Price).VndAmount();
    }
}
