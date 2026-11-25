using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Reports;

namespace NhuNguyetSpa.Application.Validators.Reports;

public sealed class RevenueLeadersQueryValidator : AbstractValidator<RevenueLeadersQuery>
{
    public RevenueLeadersQueryValidator(IOptions<ReportsOptions> options)
    {
        var maxTop = options.Value.MaxTopProducts;
        RuleFor(query => query.Top).InclusiveBetween(1, maxTop).When(query => query.Top is not null)
            .WithMessage($"Số dòng phải từ 1 đến {maxTop}.");
    }
}
