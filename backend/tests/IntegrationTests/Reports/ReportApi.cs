using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;

namespace NhuNguyetSpa.IntegrationTests.Reports;

/// <summary>
/// Seeds paid orders with their payments for report tests. Reports add up the whole (shared) test database, so every test
/// seeds and reads its own far-future year (docs/superpowers/plans/2026-11-01-uc-spa-33-revenue-reports.md).
/// </summary>
public sealed class ReportApi
{
    private readonly PostgresFixture _postgres;

    public ReportApi(PostgresFixture postgres) => _postgres = postgres;

    /// <summary>UTC instant of a Vietnam wall-clock time.</summary>
    public static DateTime VnUtc(int year, int month, int day, int hour = 10, int minute = 0, int second = 0) =>
        SpaTime.ToUtc(new DateTime(year, month, day, hour, minute, second));

    /// <summary>
    /// An order of <paramref name="lines"/> with <paramref name="succeededPayments"/> successful payments of its total (the
    /// first at <paramref name="paidAtUtc"/>, the next ones <paramref name="secondPaymentDelay"/> later) and one failed attempt.
    /// </summary>
    public async Task<Order> SeedPaidOrderAsync(
        Guid customerId, DateTime paidAtUtc, IReadOnlyList<(SpaService? Service, ServicePackage? Package, decimal LineTotal)> lines,
        OrderStatus status = OrderStatus.Paid, int succeededPayments = 1, TimeSpan? secondPaymentDelay = null, DateTime? createdAtUtc = null)
    {
        await using var context = _postgres.CreateContext();
        var total = lines.Sum(line => line.LineTotal);
        var created = createdAtUtc ?? paidAtUtc.AddMinutes(-5);
        var order = new Order
        {
            Code = "DH" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant(),
            CustomerId = customerId,
            Subtotal = total,
            GrandTotal = total,
            Status = status,
            PaymentDueAtUtc = created.AddMinutes(15),
            CreatedAtUtc = created,
            CancelledAtUtc = status == OrderStatus.Cancelled ? paidAtUtc : null,
        };
        foreach (var line in lines)
        {
            order.Items.Add(new OrderItem
            {
                OrderId = order.Id,
                SpaServiceId = line.Service?.Id,
                ServicePackageId = line.Package?.Id,
                ProductName = line.Service?.Name ?? line.Package!.Name,
                UnitPrice = line.LineTotal,
                LineTotal = line.LineTotal,
            });
        }
        context.Orders.Add(order);
        context.Payments.Add(NewPayment(order, total, PaymentStatus.Failed, null));
        for (var i = 0; i < succeededPayments; i++)
            context.Payments.Add(NewPayment(order, total, PaymentStatus.Succeeded, paidAtUtc + i * (secondPaymentDelay ?? TimeSpan.FromMinutes(1))));
        await context.SaveChangesAsync();
        return order;
    }

    private static Payment NewPayment(Order order, decimal amount, PaymentStatus status, DateTime? paidAtUtc) => new()
    {
        OrderId = order.Id,
        Provider = "vnpay",
        Amount = amount,
        Status = status,
        RequestCode = "RQ" + Guid.NewGuid().ToString("N")[..20].ToUpperInvariant(),
        ExpiresAtUtc = order.CreatedAtUtc.AddMinutes(15),
        PaidAtUtc = paidAtUtc,
    };
}
