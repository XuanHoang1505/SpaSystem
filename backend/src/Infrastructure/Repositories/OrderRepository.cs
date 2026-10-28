using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class OrderRepository : Repository<Order>, IOrderRepository
{
    public OrderRepository(AppDbContext context) : base(context)
    {
    }

    public Task<OrderDetailDto?> GetDetailAsync(Guid id, Guid customerId, CancellationToken cancellationToken)
    {
        var redemptions = Context.PromotionRedemptions;
        return Set.AsNoTracking()
            .Where(order => order.Id == id && order.CustomerId == customerId)
            .Select(order => new OrderDetailDto(
                order.Id, order.Code, order.Status, order.Subtotal, order.DiscountTotal, order.GrandTotal, order.PaymentDueAtUtc,
                order.CreatedAtUtc, false,
                order.Items.OrderBy(item => item.ProductName).ThenBy(item => item.Id)
                    .Select(item => new OrderItemDto(
                        item.Id,
                        item.SpaServiceId != null ? CatalogItemType.Service : CatalogItemType.Package,
                        item.SpaServiceId ?? item.ServicePackageId!.Value,
                        item.ProductName, item.UnitPrice, item.DiscountAmount, item.LineTotal))
                    .ToList(),
                order.Payments.OrderBy(payment => payment.CreatedAtUtc).ThenBy(payment => payment.RequestCode)
                    .Select(payment => new OrderPaymentDto(payment.Id, payment.Provider, payment.Amount, payment.Status, payment.CreatedAtUtc, payment.PaidAtUtc))
                    .ToList(),
                redemptions.Where(redemption => redemption.OrderId == order.Id)
                    .Select(redemption => new AppliedPromotionDto(redemption.PromotionCode, redemption.DiscountAmount))
                    .FirstOrDefault()))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<Guid?> FindIdByIdempotencyKeyAsync(Guid customerId, Guid key, CancellationToken cancellationToken) => Set.AsNoTracking()
        .Where(order => order.CustomerId == customerId && order.IdempotencyKey == key)
        .Select(order => (Guid?)order.Id)
        .FirstOrDefaultAsync(cancellationToken);

    public Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken) =>
        Set.AnyAsync(order => order.Code == code, cancellationToken);

    public async Task<Order?> LockAsync(Guid id, CancellationToken cancellationToken)
    {
        // Lock first, then read: the payments loaded below are those committed by whoever held the lock before us.
        await Context.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM orders WHERE id = {id} FOR UPDATE", cancellationToken);
        return await Set
            .Include(order => order.Items)
            .Include(order => order.Payments)
            .FirstOrDefaultAsync(order => order.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Order>> LockExpirableAsync(DateTime cutoffUtc, int batchSize, CancellationToken cancellationToken)
    {
        // SKIP LOCKED: an order being paid right now (row locked by a callback) is left for the next scan.
        var ids = await Context.Database
            .SqlQuery<Guid>($"""
                SELECT id AS "Value" FROM orders
                WHERE status = 'pending_payment' AND payment_due_at_utc <= {cutoffUtc}
                ORDER BY payment_due_at_utc
                LIMIT {batchSize}
                FOR UPDATE SKIP LOCKED
                """)
            .ToListAsync(cancellationToken);
        if (ids.Count == 0)
            return [];
        return await Set.Include(order => order.Payments).Where(order => ids.Contains(order.Id)).ToListAsync(cancellationToken);
    }
}
