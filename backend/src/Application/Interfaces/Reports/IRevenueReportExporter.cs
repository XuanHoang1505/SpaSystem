using NhuNguyetSpa.Application.DTOs.Reports;

namespace NhuNguyetSpa.Application.Interfaces.Reports;

/// <summary>Writes a revenue report as an <c>.xlsx</c> workbook (BR-RPT-05); implemented in Infrastructure.</summary>
public interface IRevenueReportExporter
{
    byte[] Export(RevenueReportDto report, IReadOnlyList<ProductRevenueDto> products, DateTime exportedAtUtc);
}
