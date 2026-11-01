using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.DTOs.Reports;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

// Every aggregate runs in PostgreSQL; days are cut in Vietnam time with AT TIME ZONE, not the session time zone.
public sealed class RevenueReportRepository : IRevenueReportRepository
{
    private readonly AppDbContext _context;

    public RevenueReportRepository(AppDbContext context) => _context = context;

    public async Task<IReadOnlyList<DailyRevenueRow>> GetDailyRevenueAsync(DateTime fromUtc, DateTime toUtcExclusive, CancellationToken cancellationToken)
    {
        var rows = await Recognized(fromUtc, toUtcExclusive)
            .Select(row => new
            {
                Day = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(row.PaidAtUtc, SpaTime.TimeZoneId).Date,
                row.Amount,
                ServiceRevenue = row.Order.Items.Where(item => item.SpaServiceId != null).Sum(item => item.LineTotal),
                PackageRevenue = row.Order.Items.Where(item => item.ServicePackageId != null).Sum(item => item.LineTotal),
                HasService = row.Order.Items.Any(item => item.SpaServiceId != null),
                HasPackage = row.Order.Items.Any(item => item.ServicePackageId != null),
            })
            .GroupBy(row => row.Day)
            .Select(group => new
            {
                Day = group.Key,
                Revenue = group.Sum(row => row.Amount),
                ServiceRevenue = group.Sum(row => row.ServiceRevenue),
                PackageRevenue = group.Sum(row => row.PackageRevenue),
                OrderCount = group.Count(),
                ServiceOrderCount = group.Count(row => row.HasService),
                PackageOrderCount = group.Count(row => row.HasPackage),
            })
            .OrderBy(row => row.Day)
            .ToListAsync(cancellationToken);
        return rows.Select(row => new DailyRevenueRow(DateOnly.FromDateTime(row.Day), row.Revenue, row.ServiceRevenue, row.PackageRevenue,
            row.OrderCount, row.ServiceOrderCount, row.PackageOrderCount)).ToList();
    }

    public async Task<UnrecognizedPaymentsDto> GetUnrecognizedPaymentsAsync(DateTime fromUtc, DateTime toUtcExclusive, CancellationToken cancellationToken)
    {
        var recognizedIds = Recognized(fromUtc, toUtcExclusive).Select(row => row.PaymentId);
        var totals = await _context.Payments
            .Where(payment => payment.Status == PaymentStatus.Succeeded && payment.PaidAtUtc >= fromUtc && payment.PaidAtUtc < toUtcExclusive)
            .Where(payment => !recognizedIds.Contains(payment.Id))
            .GroupBy(_ => 1)
            .Select(group => new { Count = group.Count(), Amount = group.Sum(payment => payment.Amount) })
            .FirstOrDefaultAsync(cancellationToken);
        return totals is null ? new UnrecognizedPaymentsDto(0, 0) : new UnrecognizedPaymentsDto(totals.Count, totals.Amount);
    }

    public async Task<IReadOnlyList<ProductRevenueRow>> GetProductRevenueAsync(
        DateTime fromUtc, DateTime toUtcExclusive, ReportProductType productType, int? top, CancellationToken cancellationToken)
    {
        var orderIds = Recognized(fromUtc, toUtcExclusive).Select(row => row.Order.Id);
        var items = _context.Set<OrderItem>().Where(item => orderIds.Contains(item.OrderId));
        items = productType switch
        {
            ReportProductType.Service => items.Where(item => item.SpaServiceId != null),
            ReportProductType.Package => items.Where(item => item.ServicePackageId != null),
            _ => items,
        };
        var query = items
            .GroupBy(item => new { item.SpaServiceId, item.ServicePackageId })
            .Select(group => new
            {
                group.Key.SpaServiceId,
                group.Key.ServicePackageId,
                Name = group.Key.SpaServiceId != null
                    ? _context.SpaServices.Where(service => service.Id == group.Key.SpaServiceId).Select(service => service.Name).First()
                    : _context.ServicePackages.Where(package => package.Id == group.Key.ServicePackageId).Select(package => package.Name).First(),
                Quantity = group.Count(),
                Revenue = group.Sum(item => item.LineTotal),
            })
            .OrderByDescending(row => row.Revenue)
            .ThenBy(row => row.Name);
        var rows = await (top is null ? query : query.Take(top.Value)).ToListAsync(cancellationToken);
        return rows.Select(row => row.SpaServiceId is { } serviceId
            ? new ProductRevenueRow(RevenueProductKind.Service, serviceId, row.Name, row.Quantity, row.Revenue)
            : new ProductRevenueRow(RevenueProductKind.Package, row.ServicePackageId!.Value, row.Name, row.Quantity, row.Revenue)).ToList();
    }

    /// <summary>Paid orders with their first successful payment (by time, then id) inside the range.</summary>
    private IQueryable<RecognizedPayment> Recognized(DateTime fromUtc, DateTime toUtcExclusive) =>
        _context.Orders.AsNoTracking()
            .Where(order => order.Status == OrderStatus.Paid)
            .Select(order => new
            {
                Order = order,
                Payment = order.Payments
                    .Where(payment => payment.Status == PaymentStatus.Succeeded && payment.PaidAtUtc != null)
                    .OrderBy(payment => payment.PaidAtUtc)
                    .ThenBy(payment => payment.Id)
                    .FirstOrDefault(),
            })
            .Where(row => row.Payment != null && row.Payment.PaidAtUtc >= fromUtc && row.Payment.PaidAtUtc < toUtcExclusive)
            .Select(row => new RecognizedPayment
            {
                Order = row.Order,
                PaymentId = row.Payment!.Id,
                PaidAtUtc = row.Payment.PaidAtUtc!.Value,
                Amount = row.Payment.Amount,
            });

    // Member-init (not a constructor) so later operators can still be translated to SQL.
    private sealed class RecognizedPayment
    {
        public Order Order { get; init; } = null!;
        public Guid PaymentId { get; init; }
        public DateTime PaidAtUtc { get; init; }
        public decimal Amount { get; init; }
    }
}
