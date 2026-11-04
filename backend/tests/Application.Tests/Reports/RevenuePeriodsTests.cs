using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Reports;
using NhuNguyetSpa.Application.UseCases.Reports;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Reports;

/// <summary>Report periods: labels, clipping and folding days in (docs/specs/reports.md: BR-RPT-03, A2, A3, RPT-T01).</summary>
public sealed class RevenuePeriodsTests
{
    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    private static readonly DailyRevenueRow[] Days =
    [
        new(D(2026, 10, 2), 300_000, 300_000, 0, 1, 1, 0),
        new(D(2026, 10, 20), 4_500_000, 0, 4_500_000, 1, 0, 1),
        new(D(2026, 11, 1), 1_000_000, 600_000, 400_000, 1, 1, 1),
    ];

    [Fact]
    public void MonthlyIsClipped()
    {
        var periods = RevenuePeriods.Build(D(2026, 2, 15), D(2026, 5, 10), RevenueGroupBy.Month);

        periods.Select(p => p.Label).Should().Equal("02/2026", "03/2026", "04/2026", "05/2026");
        periods[0].PeriodStart.Should().Be(D(2026, 2, 15));
        periods[0].PeriodEnd.Should().Be(D(2026, 2, 28));
        periods[3].PeriodStart.Should().Be(D(2026, 5, 1));
        periods[3].PeriodEnd.Should().Be(D(2026, 5, 10));
        periods.Should().OnlyContain(p => p.Revenue == 0 && p.OrderCount == 0);
    }

    [Fact]
    public void QuarterlyYear()
    {
        var periods = RevenuePeriods.Build(D(2026, 1, 1), D(2026, 12, 31), RevenueGroupBy.Quarter);

        periods.Select(p => p.Label).Should().Equal("Q1/2026", "Q2/2026", "Q3/2026", "Q4/2026");
        periods[1].PeriodStart.Should().Be(D(2026, 4, 1));
        periods[1].PeriodEnd.Should().Be(D(2026, 6, 30));
    }

    [Fact]
    public void YearlyRange()
    {
        var periods = RevenuePeriods.Build(D(2024, 3, 1), D(2026, 11, 1), RevenueGroupBy.Year);

        periods.Select(p => p.Label).Should().Equal("2024", "2025", "2026");
        periods[0].PeriodStart.Should().Be(D(2024, 3, 1));
        periods[0].PeriodEnd.Should().Be(D(2024, 12, 31));
        periods[2].PeriodStart.Should().Be(D(2026, 1, 1));
        periods[2].PeriodEnd.Should().Be(D(2026, 11, 1));
    }

    [Fact]
    public void QuarterAcrossYearIsClipped()
    {
        var periods = RevenuePeriods.Build(D(2041, 11, 15), D(2042, 2, 10), RevenueGroupBy.Quarter);

        periods.Select(p => p.Label).Should().Equal("Q4/2041", "Q1/2042");
        periods[0].PeriodStart.Should().Be(D(2041, 11, 15));
        periods[0].PeriodEnd.Should().Be(D(2041, 12, 31));
        periods[1].PeriodStart.Should().Be(D(2042, 1, 1));
        periods[1].PeriodEnd.Should().Be(D(2042, 2, 10));
    }

    [Fact]
    public void SingleDay()
    {
        var periods = RevenuePeriods.Build(D(2026, 10, 31), D(2026, 10, 31), RevenueGroupBy.Month);

        periods.Should().ContainSingle();
        periods[0].Label.Should().Be("10/2026");
        periods[0].PeriodStart.Should().Be(D(2026, 10, 31));
        periods[0].PeriodEnd.Should().Be(D(2026, 10, 31));
    }

    [Fact]
    public void FoldAllSumsDays()
    {
        var periods = RevenuePeriods.Fold(RevenuePeriods.Build(D(2026, 10, 1), D(2026, 11, 30), RevenueGroupBy.Month), Days, ReportProductType.All);

        periods[0].Should().Be(new RevenuePeriodDto("10/2026", D(2026, 10, 1), D(2026, 10, 31), 4_800_000, 300_000, 4_500_000, 2));
        periods[1].Should().Be(new RevenuePeriodDto("11/2026", D(2026, 11, 1), D(2026, 11, 30), 1_000_000, 600_000, 400_000, 1));
    }

    [Fact]
    public void FoldServiceOnly()
    {
        var periods = RevenuePeriods.Fold(RevenuePeriods.Build(D(2026, 10, 1), D(2026, 11, 30), RevenueGroupBy.Month), Days, ReportProductType.Service);

        periods[0].Should().Be(new RevenuePeriodDto("10/2026", D(2026, 10, 1), D(2026, 10, 31), 300_000, 300_000, 0, 1));
        periods[1].Should().Be(new RevenuePeriodDto("11/2026", D(2026, 11, 1), D(2026, 11, 30), 600_000, 600_000, 0, 1));
    }

    [Fact]
    public void FoldPackageOnly()
    {
        var periods = RevenuePeriods.Fold(RevenuePeriods.Build(D(2026, 10, 1), D(2026, 11, 30), RevenueGroupBy.Month), Days, ReportProductType.Package);

        periods[0].Should().Be(new RevenuePeriodDto("10/2026", D(2026, 10, 1), D(2026, 10, 31), 4_500_000, 0, 4_500_000, 1));
        periods[1].Should().Be(new RevenuePeriodDto("11/2026", D(2026, 11, 1), D(2026, 11, 30), 400_000, 0, 400_000, 1));
    }
}
