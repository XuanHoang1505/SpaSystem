namespace NhuNguyetSpa.Application.DTOs.Reports;

/// <summary>Recognized revenue of one Vietnam day; the per-kind counts are orders with at least one line of that kind.</summary>
public sealed record DailyRevenueRow(
    DateOnly Date,
    decimal Revenue,
    decimal ServiceRevenue,
    decimal PackageRevenue,
    int OrderCount,
    int ServiceOrderCount,
    int PackageOrderCount);

/// <summary>Recognized revenue of one product; <see cref="Quantity"/> is the number of order lines.</summary>
public sealed record ProductRevenueRow(RevenueProductKind Kind, Guid ProductId, string ProductName, int Quantity, decimal Revenue);
