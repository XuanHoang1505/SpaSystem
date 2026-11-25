namespace NhuNguyetSpa.Application.DTOs.Reports;

/// <summary>Query of <c>GET /reports/revenue/leaders</c>: the top customers and staff of a range; <c>top</c> defaults to 5.</summary>
public sealed class RevenueLeadersQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public int? Top { get; set; }
}
