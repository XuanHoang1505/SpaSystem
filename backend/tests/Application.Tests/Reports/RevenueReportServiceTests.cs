using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Reports;
using NhuNguyetSpa.Application.Interfaces.Reports;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Reports;
using NhuNguyetSpa.Application.Validators.Reports;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Reports;

/// <summary>UC-SPA-33 (docs/specs/reports.md: BR-RPT-01…05, Q-49, RPT-T02, T03, T09, T13).</summary>
public sealed class RevenueReportServiceTests
{
    // 10:00 on 01/11/2026 in Vietnam.
    private static readonly DateTime Now = new(2026, 11, 1, 3, 0, 0, DateTimeKind.Utc);
    private readonly IRevenueReportRepository _reports = Substitute.For<IRevenueReportRepository>();
    private readonly IRevenueReportExporter _exporter = Substitute.For<IRevenueReportExporter>();

    public RevenueReportServiceTests()
    {
        _reports.GetDailyRevenueAsync(Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>()).Returns([]);
        _reports.GetUnrecognizedPaymentsAsync(Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(new UnrecognizedPaymentsDto(0, 0));
        _reports.GetProductRevenueAsync(Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<ReportProductType>(), Arg.Any<int?>(), Arg.Any<CancellationToken>())
            .Returns([]);
    }

    private RevenueReportService Create()
    {
        var clock = Substitute.For<IDateTimeProvider>();
        clock.UtcNow.Returns(Now);
        var options = Options.Create(new ReportsOptions());
        return new RevenueReportService(_reports, _exporter, clock, options, new RevenueReportQueryValidator(), new RevenueByProductQueryValidator(options));
    }

    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    [Fact]
    public async Task FromAfterToIsRejected()
    {
        var act = () => Create().GetRevenueAsync(new RevenueReportQuery { FromDate = D(2026, 5, 2), ToDate = D(2026, 5, 1) }, CancellationToken.None);

        (await act.Should().ThrowAsync<ValidationException>()).Which.Errors
            .Should().ContainSingle(error => error.PropertyName == "ToDate" && error.ErrorMessage == "Ngày kết thúc phải từ ngày bắt đầu trở đi.");
    }

    [Fact]
    public async Task RangeOverFiveYearsIsRejected()
    {
        var act = () => Create().GetRevenueAsync(new RevenueReportQuery { FromDate = D(2021, 1, 1), ToDate = D(2026, 1, 1) }, CancellationToken.None);

        (await act.Should().ThrowAsync<ValidationException>()).Which.Errors
            .Should().ContainSingle(error => error.PropertyName == "ToDate" && error.ErrorMessage == "Chỉ xem tối đa 5 năm một lần.");
        var accepted = await Create().GetRevenueAsync(new RevenueReportQuery { FromDate = D(2021, 1, 1), ToDate = D(2025, 12, 31) }, CancellationToken.None);
        accepted.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task InvalidGroupByIsRejected()
    {
        var act = () => Create().GetRevenueAsync(new RevenueReportQuery { GroupBy = "week" }, CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task DefaultsToCurrentYear()
    {
        var result = await Create().GetRevenueAsync(new RevenueReportQuery(), CancellationToken.None);

        var report = result.Data!;
        report.FromDate.Should().Be(D(2026, 1, 1));
        report.ToDate.Should().Be(D(2026, 11, 1));
        report.GroupBy.Should().Be(RevenueGroupBy.Month);
        report.ProductType.Should().Be(ReportProductType.All);
        report.Periods.Should().HaveCount(11);
        await _reports.Received(1).GetDailyRevenueAsync(new DateTime(2025, 12, 31, 17, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 11, 1, 17, 0, 0, DateTimeKind.Utc), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task OnlyFromInFutureIsRejected()
    {
        var act = () => Create().GetRevenueAsync(new RevenueReportQuery { FromDate = D(2026, 12, 1) }, CancellationToken.None);

        (await act.Should().ThrowAsync<ValidationException>()).Which.Errors
            .Should().ContainSingle(error => error.PropertyName == "FromDate" && error.ErrorMessage == "Ngày bắt đầu không được sau hôm nay.");
    }

    [Theory]
    [InlineData(9999, 1999)]
    [InlineData(2026, 9999)]
    public async Task DatesFarOutsideAreRejected(int toYear, int fromYear)
    {
        var query = new RevenueReportQuery { FromDate = D(fromYear, 1, 1), ToDate = D(toYear, 12, 31) };

        var revenue = () => Create().GetRevenueAsync(query, CancellationToken.None);
        var products = () => Create().GetByProductAsync(new RevenueByProductQuery { FromDate = query.FromDate, ToDate = query.ToDate }, CancellationToken.None);

        (await revenue.Should().ThrowAsync<ValidationException>()).Which.Errors
            .Should().Contain(error => error.ErrorMessage == "Ngày phải trong khoảng năm 2000 đến 2100.");
        await products.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task TotalsEqualSumOfPeriods()
    {
        _reports.GetDailyRevenueAsync(Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>()).Returns(
        [
            new DailyRevenueRow(D(2026, 10, 2), 300_000, 300_000, 0, 1, 1, 0),
            new DailyRevenueRow(D(2026, 10, 20), 4_500_000, 0, 4_500_000, 1, 0, 1),
            new DailyRevenueRow(D(2026, 11, 1), 1_000_000, 600_000, 400_000, 1, 1, 1),
        ]);
        _reports.GetUnrecognizedPaymentsAsync(Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(new UnrecognizedPaymentsDto(1, 500_000));

        var report = (await Create().GetRevenueAsync(new RevenueReportQuery(), CancellationToken.None)).Data!;

        report.TotalRevenue.Should().Be(5_800_000);
        report.ServiceRevenue.Should().Be(900_000);
        report.PackageRevenue.Should().Be(4_900_000);
        report.OrderCount.Should().Be(3);
        report.UnrecognizedPayments.Should().Be(new UnrecognizedPaymentsDto(1, 500_000));
    }

    [Fact]
    public async Task EmptyRangeReturnsZeros()
    {
        var report = (await Create().GetRevenueAsync(
            new RevenueReportQuery { FromDate = D(2025, 1, 1), ToDate = D(2025, 12, 31), GroupBy = "quarter" }, CancellationToken.None)).Data!;

        report.Periods.Should().HaveCount(4).And.OnlyContain(period => period.Revenue == 0 && period.OrderCount == 0);
        report.TotalRevenue.Should().Be(0);
    }

    [Fact]
    public async Task SharePercentRoundsToOneDecimal()
    {
        var a = Guid.NewGuid();
        var b = Guid.NewGuid();
        _reports.GetProductRevenueAsync(Arg.Any<DateTime>(), Arg.Any<DateTime>(), ReportProductType.All, 10, Arg.Any<CancellationToken>()).Returns(
        [
            new ProductRevenueRow(RevenueProductKind.Service, a, "A", 2, 2_000_000),
            new ProductRevenueRow(RevenueProductKind.Package, b, "B", 1, 1_000_000),
        ]);
        _reports.GetDailyRevenueAsync(Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns([new DailyRevenueRow(D(2026, 10, 2), 3_000_000, 2_000_000, 1_000_000, 2, 1, 1)]);

        var result = (await Create().GetByProductAsync(new RevenueByProductQuery(), CancellationToken.None)).Data!;

        result.Items.Select(item => item.SharePercent).Should().Equal(66.7m, 33.3m);
        result.Items[0].Should().Be(new ProductRevenueDto(RevenueProductKind.Service, a, "A", 2, 2_000_000, 66.7m));
    }

    [Fact]
    public async Task SharePercentIsZeroWithoutRevenue()
    {
        _reports.GetProductRevenueAsync(Arg.Any<DateTime>(), Arg.Any<DateTime>(), Arg.Any<ReportProductType>(), Arg.Any<int?>(), Arg.Any<CancellationToken>())
            .Returns([new ProductRevenueRow(RevenueProductKind.Service, Guid.NewGuid(), "A", 1, 0)]);

        var result = (await Create().GetByProductAsync(new RevenueByProductQuery(), CancellationToken.None)).Data!;

        result.Items.Should().ContainSingle().Which.SharePercent.Should().Be(0);
    }

    [Fact]
    public async Task ExportPassesAllProducts()
    {
        var bytes = new byte[] { 1, 2, 3 };
        _exporter.Export(Arg.Any<RevenueReportDto>(), Arg.Any<IReadOnlyList<ProductRevenueDto>>(), Now).Returns(bytes);

        var file = (await Create().ExportAsync(new RevenueReportQuery { ProductType = "service" }, CancellationToken.None)).Data!;

        file.FileName.Should().Be("doanh-thu_2026-01-01_2026-11-01.xlsx");
        file.Content.Should().BeSameAs(bytes);
        await _reports.Received(1).GetProductRevenueAsync(Arg.Any<DateTime>(), Arg.Any<DateTime>(), ReportProductType.Service, null, Arg.Any<CancellationToken>());
        _exporter.Received(1).Export(Arg.Is<RevenueReportDto>(report => report.ProductType == ReportProductType.Service && report.Periods.Count == 11),
            Arg.Any<IReadOnlyList<ProductRevenueDto>>(), Now);
    }
}
