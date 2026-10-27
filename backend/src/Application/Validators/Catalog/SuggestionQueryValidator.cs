using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

public sealed class SuggestionQueryValidator : AbstractValidator<SuggestionQuery>
{
    public const int MinLength = 2;

    public SuggestionQueryValidator() => RuleFor(query => query.Search)
        .Must(search => search?.Trim().Length is >= MinLength and <= CatalogQuery.MaxSearchLength)
        .WithMessage($"Từ khóa gợi ý phải từ {MinLength} đến {CatalogQuery.MaxSearchLength} ký tự.");
}
