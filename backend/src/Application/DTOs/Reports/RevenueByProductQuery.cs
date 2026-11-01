namespace NhuNguyetSpa.Application.DTOs.Reports;

/// <summary>Query of <c>GET /reports/revenue/by-product</c> (BR-RPT-04).</summary>
public sealed class RevenueByProductQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public string? ProductType { get; set; }
    public int? Top { get; set; }
}
