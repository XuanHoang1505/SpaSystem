using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Reports;
using NhuNguyetSpa.Application.UseCases.Reports;

namespace NhuNguyetSpa.Application.Validators.Reports;

public sealed class RevenueByProductQueryValidator : AbstractValidator<RevenueByProductQuery>
{
    public RevenueByProductQueryValidator(IOptions<ReportsOptions> options)
    {
        var maxTop = options.Value.MaxTopProducts;
        RuleFor(query => query.ProductType).Must(value => ReportText.TryParseProductType(value, out _))
            .WithMessage(RevenueReportQueryValidator.ProductTypeMessage);
        RuleFor(query => query.Top).InclusiveBetween(1, maxTop).When(query => query.Top is not null)
            .WithMessage($"Số sản phẩm phải từ 1 đến {maxTop}.");
    }
}
