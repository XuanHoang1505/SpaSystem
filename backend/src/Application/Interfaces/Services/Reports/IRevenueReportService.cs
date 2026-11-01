using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Reports;

namespace NhuNguyetSpa.Application.Interfaces.Services.Reports;

/// <summary>UC-SPA-33: the owner's revenue report, by period, by product and as an Excel file (docs/specs/reports.md).</summary>
public interface IRevenueReportService
{
    Task<OperationResult<RevenueReportDto>> GetRevenueAsync(RevenueReportQuery query, CancellationToken cancellationToken);

    Task<OperationResult<RevenueByProductDto>> GetByProductAsync(RevenueByProductQuery query, CancellationToken cancellationToken);

    /// <summary>The same report as <see cref="GetRevenueAsync"/> plus every product of the criterion.</summary>
    Task<OperationResult<RevenueReportFile>> ExportAsync(RevenueReportQuery query, CancellationToken cancellationToken);
}
