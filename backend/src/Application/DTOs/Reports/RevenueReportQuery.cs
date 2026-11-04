namespace NhuNguyetSpa.Application.DTOs.Reports;

/// <summary>
/// Query of <c>GET /reports/revenue</c> and its export: Vietnam dates, inclusive; <see cref="GroupBy"/> and
/// <see cref="ProductType"/> are parsed case-insensitively, blank means the default (docs/specs/reports.md).
/// </summary>
public sealed class RevenueReportQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public string? GroupBy { get; set; }
    public string? ProductType { get; set; }
}
