using System.Globalization;
using NhuNguyetSpa.Application.DTOs.Reports;

namespace NhuNguyetSpa.Application.UseCases.Reports;

/// <summary>Cuts a range into month/quarter/year periods and adds daily revenue into them (BR-RPT-03, UC-SPA-33 A2, A3).</summary>
public static class RevenuePeriods
{
    /// <summary>Every period of <c>[from, to]</c> in order, the first and last clipped to the range, all values 0.</summary>
    public static IReadOnlyList<RevenuePeriodDto> Build(DateOnly from, DateOnly to, RevenueGroupBy groupBy)
    {
        var periods = new List<RevenuePeriodDto>();
        var start = PeriodStartOf(from, groupBy);
        while (start <= to)
        {
            var next = groupBy switch
            {
                RevenueGroupBy.Month => start.AddMonths(1),
                RevenueGroupBy.Quarter => start.AddMonths(3),
                _ => start.AddYears(1),
            };
            var end = next.AddDays(-1);
            periods.Add(new RevenuePeriodDto(Label(start, groupBy), start < from ? from : start, end > to ? to : end, 0, 0, 0, 0));
            start = next;
        }
        return periods;
    }

    /// <summary>Adds each day into the period containing it; for one product type only that type's revenue and orders count.</summary>
    public static IReadOnlyList<RevenuePeriodDto> Fold(IReadOnlyList<RevenuePeriodDto> periods, IEnumerable<DailyRevenueRow> days,
        ReportProductType productType)
    {
        var result = periods.ToArray();
        foreach (var day in days)
        {
            var index = Array.FindIndex(result, period => period.PeriodStart <= day.Date && day.Date <= period.PeriodEnd);
            if (index < 0)
                continue;
            var (revenue, service, package, orders) = productType switch
            {
                ReportProductType.Service => (day.ServiceRevenue, day.ServiceRevenue, 0m, day.ServiceOrderCount),
                ReportProductType.Package => (day.PackageRevenue, 0m, day.PackageRevenue, day.PackageOrderCount),
                _ => (day.Revenue, day.ServiceRevenue, day.PackageRevenue, day.OrderCount),
            };
            var period = result[index];
            result[index] = period with
            {
                Revenue = period.Revenue + revenue,
                ServiceRevenue = period.ServiceRevenue + service,
                PackageRevenue = period.PackageRevenue + package,
                OrderCount = period.OrderCount + orders,
            };
        }
        return result;
    }

    private static DateOnly PeriodStartOf(DateOnly day, RevenueGroupBy groupBy) => groupBy switch
    {
        RevenueGroupBy.Month => new DateOnly(day.Year, day.Month, 1),
        RevenueGroupBy.Quarter => new DateOnly(day.Year, (day.Month - 1) / 3 * 3 + 1, 1),
        _ => new DateOnly(day.Year, 1, 1),
    };

    private static string Label(DateOnly start, RevenueGroupBy groupBy) => groupBy switch
    {
        RevenueGroupBy.Month => start.ToString("MM/yyyy", CultureInfo.InvariantCulture),
        RevenueGroupBy.Quarter => string.Create(CultureInfo.InvariantCulture, $"Q{(start.Month - 1) / 3 + 1}/{start.Year}"),
        _ => start.Year.ToString(CultureInfo.InvariantCulture),
    };
}
