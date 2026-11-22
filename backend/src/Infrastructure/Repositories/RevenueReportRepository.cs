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
                // An installment order is one package, and each installment brings its own amount (BR-INS-10).
                ServiceRevenue = row.Order.PaymentPlan == PaymentPlan.Installment
                    ? 0
                    : row.Order.Items.Where(item => item.SpaServiceId != null).Sum(item => item.LineTotal),
                PackageRevenue = row.Order.PaymentPlan == PaymentPlan.Installment
                    ? row.Amount
                    : row.Order.Items.Where(item => item.ServicePackageId != null).Sum(item => item.LineTotal),
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
        // Orders paid in full: their lines. Installment orders: each recognized installment goes to the order's package, and the
        // package counts once, with its first installment (BR-INS-10).
        var recognized = Recognized(fromUtc, toUtcExclusive);
        var fullOrderIds = recognized.Where(row => row.Order.PaymentPlan == PaymentPlan.Full).Select(row => row.Order.Id);
        var items = _context.Set<OrderItem>().Where(item => fullOrderIds.Contains(item.OrderId));
        items = productType switch
        {
            ReportProductType.Service => items.Where(item => item.SpaServiceId != null),
            ReportProductType.Package => items.Where(item => item.ServicePackageId != null),
            _ => items,
        };
        var lines = await items
            .GroupBy(item => new { item.SpaServiceId, item.ServicePackageId })
            .Select(group => new ProductTotal(group.Key.SpaServiceId, group.Key.ServicePackageId, group.Count(), group.Sum(item => item.LineTotal)))
            .ToListAsync(cancellationToken);
        var installments = productType == ReportProductType.Service
            ? []
            : await recognized.Where(row => row.Order.PaymentPlan == PaymentPlan.Installment)
                .Select(row => new
                {
                    PackageId = row.Order.Items.Select(item => item.ServicePackageId).FirstOrDefault(),
                    row.Amount,
                    First = row.InstallmentSequenceNumber == 1,
                })
                .Where(row => row.PackageId != null)
                .GroupBy(row => row.PackageId)
                .Select(group => new ProductTotal(null, group.Key, group.Count(row => row.First), group.Sum(row => row.Amount)))
                .ToListAsync(cancellationToken);

        var totals = lines.Concat(installments)
            .GroupBy(row => (row.SpaServiceId, row.ServicePackageId))
            .Select(group => new ProductTotal(group.Key.SpaServiceId, group.Key.ServicePackageId, group.Sum(row => row.Quantity),
                group.Sum(row => row.Revenue)))
            .ToList();
        var serviceIds = totals.Select(row => row.SpaServiceId).OfType<Guid>().ToList();
        var packageIds = totals.Select(row => row.ServicePackageId).OfType<Guid>().ToList();
        var names = (await _context.SpaServices.AsNoTracking().Where(service => serviceIds.Contains(service.Id))
                .Select(service => new { service.Id, service.Name }).ToListAsync(cancellationToken))
            .Concat(await _context.ServicePackages.AsNoTracking().Where(package => packageIds.Contains(package.Id))
                .Select(package => new { package.Id, package.Name }).ToListAsync(cancellationToken))
            .ToDictionary(row => row.Id, row => row.Name);

        var ordered = totals
            .Select(row => row.SpaServiceId is { } serviceId
                ? new ProductRevenueRow(RevenueProductKind.Service, serviceId, names.GetValueOrDefault(serviceId, string.Empty), row.Quantity, row.Revenue)
                : new ProductRevenueRow(RevenueProductKind.Package, row.ServicePackageId!.Value,
                    names.GetValueOrDefault(row.ServicePackageId!.Value, string.Empty), row.Quantity, row.Revenue))
            .OrderByDescending(row => row.Revenue)
            .ThenBy(row => row.ProductName, StringComparer.Ordinal);
        return (top is null ? ordered : ordered.Take(top.Value)).ToList();
    }

    private sealed record ProductTotal(Guid? SpaServiceId, Guid? ServicePackageId, int Quantity, decimal Revenue);

    /// <summary>
    /// Recognized payments inside the range (Q-46, BR-INS-10): for a paid order paid in full, its first successful payment (by time,
    /// then id); for an installment order, the first successful payment of each paid installment. Anything else is unrecognized.
    /// </summary>
    private IQueryable<RecognizedPayment> Recognized(DateTime fromUtc, DateTime toUtcExclusive) =>
        _context.Payments.AsNoTracking()
            .Where(payment => payment.Status == PaymentStatus.Succeeded && payment.PaidAtUtc != null &&
                              payment.PaidAtUtc >= fromUtc && payment.PaidAtUtc < toUtcExclusive)
            .Where(payment =>
                (payment.Order.PaymentPlan == PaymentPlan.Full && payment.Order.Status == OrderStatus.Paid &&
                 payment.Id == payment.Order.Payments
                     .Where(first => first.Status == PaymentStatus.Succeeded && first.PaidAtUtc != null)
                     .OrderBy(first => first.PaidAtUtc).ThenBy(first => first.Id)
                     .Select(first => first.Id)
                     .FirstOrDefault()) ||
                (payment.Order.PaymentPlan == PaymentPlan.Installment && payment.Installment != null &&
                 payment.Installment.Status == InstallmentStatus.Paid &&
                 payment.Id == payment.Order.Payments
                     .Where(first => first.InstallmentId == payment.InstallmentId && first.Status == PaymentStatus.Succeeded && first.PaidAtUtc != null)
                     .OrderBy(first => first.PaidAtUtc).ThenBy(first => first.Id)
                     .Select(first => first.Id)
                     .FirstOrDefault()))
            .Select(payment => new RecognizedPayment
            {
                Order = payment.Order,
                PaymentId = payment.Id,
                PaidAtUtc = payment.PaidAtUtc!.Value,
                Amount = payment.Amount,
                InstallmentSequenceNumber = payment.Installment != null ? payment.Installment.SequenceNumber : null,
            });

    // Member-init (not a constructor) so later operators can still be translated to SQL.
    private sealed class RecognizedPayment
    {
        public Order Order { get; init; } = null!;
        public Guid PaymentId { get; init; }
        public DateTime PaidAtUtc { get; init; }
        public decimal Amount { get; init; }
        public int? InstallmentSequenceNumber { get; init; }
    }
}
