using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
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
        var appointments = Context.Appointments;
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
                    .FirstOrDefault(),
                appointments.Where(appointment => appointment.OrderItem != null && appointment.OrderItem.OrderId == order.Id)
                    .OrderByDescending(appointment => appointment.CreatedAtUtc)
                    .Select(appointment => new OrderAppointmentDto(
                        appointment.Id, appointment.Date, appointment.StartTime, appointment.EndTime, appointment.Status,
                        new AppointmentStaffDto(appointment.StaffMemberId, appointment.StaffMember.User.FullName)))
                    .FirstOrDefault(),
                false,
                order.CancelledAtUtc,
                order.CancellationReason))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<PagedResult<(MyOrderListItemDto Item, OrderActionFacts Facts)>> SearchMineAsync(OrderSearchCriteria criteria,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var customerId = criteria.CustomerId ?? throw new ArgumentException("A customer is required.", nameof(criteria));
        var query = Filter(Set.AsNoTracking().Where(order => order.CustomerId == customerId), criteria);
        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(order => order.CreatedAtUtc).ThenBy(order => order.Code)
            .Skip((criteria.PageNumber - 1) * criteria.PageSize)
            .Take(criteria.PageSize)
            .Select(order => new
            {
                order.Id,
                order.Code,
                order.Status,
                order.CreatedAtUtc,
                order.PaymentDueAtUtc,
                order.GrandTotal,
                Names = order.Items.OrderBy(item => item.ProductName).ThenBy(item => item.Id).Select(item => item.ProductName).ToList(),
                PaymentCount = order.Payments.Count,
                LatestPending = order.Payments.Where(payment => payment.Status == PaymentStatus.Pending)
                    .Max(payment => (DateTime?)payment.CreatedAtUtc),
            })
            .ToListAsync(cancellationToken);
        var items = rows.Select(row => (
            new MyOrderListItemDto(row.Id, row.Code, row.Status, row.CreatedAtUtc, row.PaymentDueAtUtc, row.GrandTotal, row.Names.Count, row.Names,
                false, false),
            new OrderActionFacts(row.Status, row.PaymentDueAtUtc, row.PaymentCount, row.LatestPending)));
        return new PagedResult<(MyOrderListItemDto Item, OrderActionFacts Facts)>(items, criteria.PageNumber, criteria.PageSize, total);
    }

    public async Task<PagedResult<OrderListItemDto>> SearchAsync(OrderSearchCriteria criteria, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var query = Filter(Set.AsNoTracking(), criteria);
        if (criteria.Search is { } search)
        {
            var pattern = CatalogSearchText.Contains(search);
            // Codes are stored upper-case; email is citext, so LIKE on it already ignores case.
            var codePattern = pattern.ToUpperInvariant();
            query = query.Where(order =>
                EF.Functions.Like(order.Code, codePattern, CatalogSearchText.EscapeCharacter) ||
                EF.Functions.Like(AppDbContext.Unaccent(order.Customer.User.FullName.ToLower()), AppDbContext.Unaccent(pattern.ToLower()),
                    CatalogSearchText.EscapeCharacter) ||
                EF.Functions.Like(order.Customer.User.PhoneNumber, pattern, CatalogSearchText.EscapeCharacter) ||
                EF.Functions.Like(order.Customer.User.Email, pattern, CatalogSearchText.EscapeCharacter));
        }

        var total = await query.CountAsync(cancellationToken);
        var ordered = (criteria.SortBy, criteria.Direction) switch
        {
            (OrderSortField.GrandTotal, SortDirection.Asc) => query.OrderBy(order => order.GrandTotal),
            (OrderSortField.GrandTotal, _) => query.OrderByDescending(order => order.GrandTotal),
            (_, SortDirection.Asc) => query.OrderBy(order => order.CreatedAtUtc),
            _ => query.OrderByDescending(order => order.CreatedAtUtc),
        };
        var redemptions = Context.PromotionRedemptions;
        var items = await ordered.ThenBy(order => order.Code)
            .Skip((criteria.PageNumber - 1) * criteria.PageSize)
            .Take(criteria.PageSize)
            .Select(order => new OrderListItemDto(
                order.Id, order.Code, order.Status, order.CreatedAtUtc, order.PaymentDueAtUtc, order.GrandTotal, order.Items.Count,
                new AppointmentCustomerDto(order.CustomerId, order.Customer.User.FullName, order.Customer.User.PhoneNumber),
                order.Payments.Count,
                order.Payments.OrderByDescending(payment => payment.CreatedAtUtc).ThenByDescending(payment => payment.RequestCode)
                    .Select(payment => (PaymentStatus?)payment.Status)
                    .FirstOrDefault(),
                redemptions.Where(redemption => redemption.OrderId == order.Id).Select(redemption => redemption.PromotionCode).FirstOrDefault()))
            .ToListAsync(cancellationToken);
        return new PagedResult<OrderListItemDto>(items, criteria.PageNumber, criteria.PageSize, total);
    }

    public Task<OwnerOrderDetailDto?> GetOwnerDetailAsync(Guid id, CancellationToken cancellationToken)
    {
        // Same items, promotion and appointment as GetDetailAsync; EF needs each projection inline in the query.
        var redemptions = Context.PromotionRedemptions;
        var appointments = Context.Appointments;
        return Set.AsNoTracking()
            .Where(order => order.Id == id)
            .Select(order => new OwnerOrderDetailDto(
                order.Id, order.Code, order.Status, order.Subtotal, order.DiscountTotal, order.GrandTotal, order.PaymentDueAtUtc,
                order.CreatedAtUtc, false, false, order.CancelledAtUtc, order.CancellationReason,
                new OrderCustomerDto(order.CustomerId, order.Customer.User.FullName, order.Customer.User.PhoneNumber, order.Customer.User.Email),
                order.Items.OrderBy(item => item.ProductName).ThenBy(item => item.Id)
                    .Select(item => new OrderItemDto(
                        item.Id,
                        item.SpaServiceId != null ? CatalogItemType.Service : CatalogItemType.Package,
                        item.SpaServiceId ?? item.ServicePackageId!.Value,
                        item.ProductName, item.UnitPrice, item.DiscountAmount, item.LineTotal))
                    .ToList(),
                order.Payments.OrderBy(payment => payment.CreatedAtUtc).ThenBy(payment => payment.RequestCode)
                    .Select(payment => new OwnerOrderPaymentDto(payment.Id, payment.Provider, payment.Amount, payment.Status, payment.RequestCode,
                        payment.ProviderTransactionId, payment.CreatedAtUtc, payment.ExpiresAtUtc, payment.PaidAtUtc))
                    .ToList(),
                redemptions.Where(redemption => redemption.OrderId == order.Id)
                    .Select(redemption => new AppliedPromotionDto(redemption.PromotionCode, redemption.DiscountAmount))
                    .FirstOrDefault(),
                appointments.Where(appointment => appointment.OrderItem != null && appointment.OrderItem.OrderId == order.Id)
                    .OrderByDescending(appointment => appointment.CreatedAtUtc)
                    .Select(appointment => new OrderAppointmentDto(
                        appointment.Id, appointment.Date, appointment.StartTime, appointment.EndTime, appointment.Status,
                        new AppointmentStaffDto(appointment.StaffMemberId, appointment.StaffMember.User.FullName)))
                    .FirstOrDefault()))
            .FirstOrDefaultAsync(cancellationToken);
    }

    /// <summary>Status and creation-time filters shared by both order lists (BR-ORD-11).</summary>
    private static IQueryable<Order> Filter(IQueryable<Order> query, OrderSearchCriteria criteria)
    {
        if (criteria.Status is { } status)
            query = query.Where(order => order.Status == status);
        if (criteria.FromUtc is { } fromUtc)
            query = query.Where(order => order.CreatedAtUtc >= fromUtc);
        if (criteria.ToUtcExclusive is { } toUtc)
            query = query.Where(order => order.CreatedAtUtc < toUtc);
        return query;
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
