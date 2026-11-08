using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

public sealed class ServiceFieldsValidator : AbstractValidator<IServiceFields>
{
    public ServiceFieldsValidator()
    {
        RuleFor(request => request.Name).RequiredText(150, "tên dịch vụ");
        RuleFor(request => request.CategoryId).NotEmpty().WithMessage("Vui lòng chọn danh mục dịch vụ.");
        RuleFor(request => request.Description).MaximumLength(CatalogRules.MaxDescriptionLength)
            .WithMessage($"Mô tả tối đa {CatalogRules.MaxDescriptionLength} ký tự.");
        RuleFor(request => request.DurationMinutes).InclusiveBetween(1, 1440).WithMessage("Thời lượng phải từ 1 đến 1440 phút.");
        RuleFor(request => request.Price).VndAmount();
        RuleFor(request => request.ShortDescription).MaximumLength(CatalogRules.MaxShortDescriptionLength)
            .WithMessage($"Mô tả ngắn tối đa {CatalogRules.MaxShortDescriptionLength} ký tự.");

        // BR-CAT-16: at most 12 steps; their minutes (when given) fit in the service duration.
        RuleFor(request => request.Steps)
            .Must(steps => steps is null || steps.Count <= CatalogRules.MaxSteps)
            .WithMessage($"Quy trình tối đa {CatalogRules.MaxSteps} bước.")
            .Must((request, steps) => steps is null || steps.Sum(step => step?.DurationMinutes ?? 0) <= request.DurationMinutes)
            .WithMessage("Tổng thời lượng các bước không được vượt quá thời lượng dịch vụ.");
        RuleForEach(request => request.Steps).ChildRules(step =>
        {
            step.RuleFor(item => item.Title).RequiredText(100, "tên bước");
            step.RuleFor(item => item.Description).MaximumLength(500).WithMessage("Mô tả bước tối đa 500 ký tự.");
            step.RuleFor(item => item.DurationMinutes).InclusiveBetween(1, 600).When(item => item.DurationMinutes is not null)
                .WithMessage("Thời lượng bước phải từ 1 đến 600 phút.");
        });
    }
}
