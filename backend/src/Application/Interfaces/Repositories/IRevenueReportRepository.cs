using NhuNguyetSpa.Application.DTOs.Reports;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>
/// Read-only revenue aggregates over <c>[fromUtc, toUtcExclusive)</c> of the payment time (BR-RPT-01, 02, 04). A recognized
/// payment is the earliest successful payment of a paid order; zero-total orders have none and never count (Q-46, Q-47).
/// </summary>
public interface IRevenueReportRepository
{
    /// <summary>One row per Vietnam day with recognized revenue, ascending.</summary>
    Task<IReadOnlyList<DailyRevenueRow>> GetDailyRevenueAsync(DateTime fromUtc, DateTime toUtcExclusive, CancellationToken cancellationToken);

    /// <summary>Successful payments in the range that are not recognized (order not paid, or not its first success).</summary>
    Task<UnrecognizedPaymentsDto> GetUnrecognizedPaymentsAsync(DateTime fromUtc, DateTime toUtcExclusive, CancellationToken cancellationToken);

    /// <summary>Revenue per product, revenue descending then name; <paramref name="top"/> null returns every product.</summary>
    Task<IReadOnlyList<ProductRevenueRow>> GetProductRevenueAsync(
        DateTime fromUtc, DateTime toUtcExclusive, ReportProductType productType, int? top, CancellationToken cancellationToken);
}
