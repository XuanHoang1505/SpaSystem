using System.Globalization;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Reports;
using NhuNguyetSpa.Application.Interfaces.Reports;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Reports;

namespace NhuNguyetSpa.Application.UseCases.Reports;

/// <summary>UC-SPA-33: revenue by period and by product, and its Excel export (docs/specs/reports.md, BR-RPT-01…05, Q-46…Q-49).</summary>
public sealed class RevenueReportService : IRevenueReportService
{
    public const int DefaultTop = 10;
    private const int MinYear = 2000;
    private const int MaxYear = 2100;
    private const string DateWindowMessage = "Ngày phải trong khoảng năm 2000 đến 2100.";

    private readonly IRevenueReportRepository _reports;
    private readonly IRevenueReportExporter _exporter;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<ReportsOptions> _options;
    private readonly IValidator<RevenueReportQuery> _reportValidator;
    private readonly IValidator<RevenueByProductQuery> _productValidator;

    public RevenueReportService(IRevenueReportRepository reports, IRevenueReportExporter exporter, IDateTimeProvider clock,
        IOptions<ReportsOptions> options, IValidator<RevenueReportQuery> reportValidator, IValidator<RevenueByProductQuery> productValidator)
    {
        _reports = reports;
        _exporter = exporter;
        _clock = clock;
        _options = options;
        _reportValidator = reportValidator;
        _productValidator = productValidator;
    }

    public async Task<OperationResult<RevenueReportDto>> GetRevenueAsync(RevenueReportQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        await _reportValidator.ValidateAndThrowAsync(query, cancellationToken);
        return OperationResult<RevenueReportDto>.Success(await BuildReportAsync(query, cancellationToken));
    }

    public async Task<OperationResult<RevenueByProductDto>> GetByProductAsync(RevenueByProductQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        await _productValidator.ValidateAndThrowAsync(query, cancellationToken);
        var (from, to) = ResolveRange(query.FromDate, query.ToDate);
        ReportText.TryParseProductType(query.ProductType, out var productType);
        var items = await ProductsAsync(from, to, productType, query.Top ?? DefaultTop, cancellationToken);
        return OperationResult<RevenueByProductDto>.Success(new RevenueByProductDto(from, to, productType, items));
    }

    public async Task<OperationResult<RevenueReportFile>> ExportAsync(RevenueReportQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        await _reportValidator.ValidateAndThrowAsync(query, cancellationToken);
        var report = await BuildReportAsync(query, cancellationToken);
        var products = await ProductsAsync(report.FromDate, report.ToDate, report.ProductType, null, cancellationToken);
        var content = _exporter.Export(report, products, _clock.UtcNow);
        var fileName = string.Create(CultureInfo.InvariantCulture, $"doanh-thu_{report.FromDate:yyyy-MM-dd}_{report.ToDate:yyyy-MM-dd}.xlsx");
        return OperationResult<RevenueReportFile>.Success(new RevenueReportFile(content, fileName));
    }

    private async Task<RevenueReportDto> BuildReportAsync(RevenueReportQuery query, CancellationToken cancellationToken)
    {
        var (from, to) = ResolveRange(query.FromDate, query.ToDate);
        ReportText.TryParseGroupBy(query.GroupBy, out var groupBy);
        ReportText.TryParseProductType(query.ProductType, out var productType);
        var (fromUtc, toUtc) = UtcRange(from, to);
        var days = await _reports.GetDailyRevenueAsync(fromUtc, toUtc, cancellationToken);
        var unrecognized = await _reports.GetUnrecognizedPaymentsAsync(fromUtc, toUtc, cancellationToken);
        var periods = RevenuePeriods.Fold(RevenuePeriods.Build(from, to, groupBy), days, productType);
        return new RevenueReportDto(from, to, groupBy, productType,
            periods.Sum(period => period.Revenue), periods.Sum(period => period.ServiceRevenue), periods.Sum(period => period.PackageRevenue),
            periods.Sum(period => period.OrderCount), periods, unrecognized);
    }

    /// <summary>Products of the criterion with their share of the criterion's revenue over the whole range (not only the top rows).</summary>
    private async Task<IReadOnlyList<ProductRevenueDto>> ProductsAsync(DateOnly from, DateOnly to, ReportProductType productType, int? top,
        CancellationToken cancellationToken)
    {
        var (fromUtc, toUtc) = UtcRange(from, to);
        var rows = await _reports.GetProductRevenueAsync(fromUtc, toUtc, productType, top, cancellationToken);
        var days = await _reports.GetDailyRevenueAsync(fromUtc, toUtc, cancellationToken);
        var total = productType switch
        {
            ReportProductType.Service => days.Sum(day => day.ServiceRevenue),
            ReportProductType.Package => days.Sum(day => day.PackageRevenue),
            _ => days.Sum(day => day.Revenue),
        };
        return rows.Select(row => new ProductRevenueDto(row.Kind, row.ProductId, row.ProductName, row.Quantity, row.Revenue,
            total == 0 ? 0 : Math.Round(row.Revenue * 100 / total, 1, MidpointRounding.AwayFromZero))).ToList();
    }

    /// <summary>Q-49: no end → today in Vietnam, no start → 1 January of the end's year; then BR-RPT-03.</summary>
    private (DateOnly From, DateOnly To) ResolveRange(DateOnly? fromDate, DateOnly? toDate)
    {
        var to = toDate ?? SpaTime.Today(_clock.UtcNow);
        var from = fromDate ?? new DateOnly(to.Year, 1, 1);
        var maxYears = _options.Value.MaxRangeYears;
        // A year window first, so the date arithmetic below can never overflow near DateOnly.MaxValue.
        if (from.Year is < MinYear or > MaxYear)
            Reject(nameof(RevenueReportQuery.FromDate), DateWindowMessage);
        if (to.Year is < MinYear or > MaxYear)
            Reject(nameof(RevenueReportQuery.ToDate), DateWindowMessage);
        if (from > to && toDate is null)
            Reject(nameof(RevenueReportQuery.FromDate), "Ngày bắt đầu không được sau hôm nay.");
        if (from > to)
            Reject(nameof(RevenueReportQuery.ToDate), "Ngày kết thúc phải từ ngày bắt đầu trở đi.");
        if (to >= from.AddYears(maxYears))
            Reject(nameof(RevenueReportQuery.ToDate), $"Chỉ xem tối đa {maxYears} năm một lần.");
        return (from, to);
    }

    private static void Reject(string field, string message) =>
        throw new ValidationException([new ValidationFailure(field, message) { ErrorCode = "validation_error" }]);

    private static (DateTime FromUtc, DateTime ToUtcExclusive) UtcRange(DateOnly from, DateOnly to) =>
        (SpaTime.StartOfDayUtc(from), SpaTime.StartOfDayUtc(to.AddDays(1)));
}
