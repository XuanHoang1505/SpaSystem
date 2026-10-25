using FluentValidation;
using NhuNguyetSpa.Application.Common.Models;

namespace NhuNguyetSpa.Application.Validators;

public sealed class PagedQueryValidator : AbstractValidator<PagedQuery>
{
    public PagedQueryValidator()
    {
        RuleFor(query => query.SortDirection).IsInEnum();
        RuleFor(query => query.Search).MaximumLength(200);
        RuleFor(query => query.SortBy).MaximumLength(100);
    }
}
