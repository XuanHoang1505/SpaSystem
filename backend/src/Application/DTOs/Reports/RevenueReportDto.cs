namespace NhuNguyetSpa.Application.DTOs.Reports;

/// <summary>Revenue of a range split into periods (BR-RPT-01…03); totals are the sum of the periods.</summary>
public sealed record RevenueReportDto(
    DateOnly FromDate,
    DateOnly ToDate,
    RevenueGroupBy GroupBy,
    ReportProductType ProductType,
    decimal TotalRevenue,
    decimal ServiceRevenue,
    decimal PackageRevenue,
    int OrderCount,
    IReadOnlyList<RevenuePeriodDto> Periods,
    UnrecognizedPaymentsDto UnrecognizedPayments);

/// <summary>One period, clipped to the report range.</summary>
public sealed record RevenuePeriodDto(
    string Label,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    decimal Revenue,
    decimal ServiceRevenue,
    decimal PackageRevenue,
    int OrderCount);

/// <summary>Successful payments not counted as revenue (cancelled or expired order, a second success): refunded by hand (BR-RPT-02, Q-46).</summary>
public sealed record UnrecognizedPaymentsDto(int Count, decimal Amount);
