using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Reports;
using NhuNguyetSpa.Application.UseCases.Reports;

namespace NhuNguyetSpa.Application.Validators.Reports;

/// <summary>Parameter values only; the date range is checked by the service once the defaults are filled in (BR-RPT-03).</summary>
public sealed class RevenueReportQueryValidator : AbstractValidator<RevenueReportQuery>
{
    public const string GroupByMessage = "Cách nhóm chỉ nhận month, quarter hoặc year.";
    public const string ProductTypeMessage = "Tiêu chí chỉ nhận all, service hoặc package.";

    public RevenueReportQueryValidator()
    {
        RuleFor(query => query.GroupBy).Must(value => ReportText.TryParseGroupBy(value, out _)).WithMessage(GroupByMessage);
        RuleFor(query => query.ProductType).Must(value => ReportText.TryParseProductType(value, out _)).WithMessage(ProductTypeMessage);
    }
}
