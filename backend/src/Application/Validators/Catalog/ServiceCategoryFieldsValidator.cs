using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

/// <summary>BR-CAT-10 for the name and description of a service category.</summary>
public sealed class ServiceCategoryFieldsValidator : AbstractValidator<IServiceCategoryFields>
{
    public const int MaxNameLength = 100;
    public const int MaxDescriptionLength = 500;
    public const int MaxSortOrder = 999;

    public ServiceCategoryFieldsValidator()
    {
        RuleFor(request => request.Name).RequiredText(MaxNameLength, "tên danh mục");
        RuleFor(request => request.Description).MaximumLength(MaxDescriptionLength)
            .WithMessage($"Mô tả danh mục tối đa {MaxDescriptionLength} ký tự.");
    }
}
