namespace NhuNguyetSpa.Application.DTOs.Reports;

/// <summary>Revenue per product, highest first (BR-RPT-04).</summary>
public sealed record RevenueByProductDto(DateOnly FromDate, DateOnly ToDate, ReportProductType ProductType, IReadOnlyList<ProductRevenueDto> Items);

/// <summary><see cref="SharePercent"/>: part of the criterion's total revenue, one decimal.</summary>
public sealed record ProductRevenueDto(
    RevenueProductKind ProductType,
    Guid ProductId,
    string ProductName,
    int Quantity,
    decimal Revenue,
    decimal SharePercent);
