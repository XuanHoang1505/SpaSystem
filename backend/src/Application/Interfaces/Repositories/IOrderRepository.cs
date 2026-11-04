using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

public interface IOrderRepository : IRepository<Order>
{
    /// <summary>The customer's order, or null when missing or someone else's. <c>IsPayable</c> is left false for the service to fill.</summary>
    Task<OrderDetailDto?> GetDetailAsync(Guid id, Guid customerId, CancellationToken cancellationToken);

    /// <summary>
    /// A page of one customer's orders (<see cref="OrderSearchCriteria.CustomerId"/> required), newest first; the flags are left false
    /// for the service to fill from the facts.
    /// </summary>
    Task<PagedResult<(MyOrderListItemDto Item, OrderActionFacts Facts)>> SearchMineAsync(OrderSearchCriteria criteria, CancellationToken cancellationToken);

    /// <summary>The owner's list (BR-ORD-11): every customer, filtered, searched and sorted as the criteria say, ties by code.</summary>
    Task<PagedResult<OrderListItemDto>> SearchAsync(OrderSearchCriteria criteria, CancellationToken cancellationToken);

    /// <summary>Any customer's order for the owner, or null; <c>IsPayable</c> and <c>CanCancel</c> are left false for the service.</summary>
    Task<OwnerOrderDetailDto?> GetOwnerDetailAsync(Guid id, CancellationToken cancellationToken);

    Task<Guid?> FindIdByIdempotencyKeyAsync(Guid customerId, Guid key, CancellationToken cancellationToken);

    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken);

    /// <summary>
    /// Locks the order row (<c>FOR UPDATE</c>, inside the caller's transaction) and then loads it tracked with its items and
    /// payments, so the payment rows read are those after any concurrent result was committed.
    /// </summary>
    Task<Order?> LockAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Pending orders due at or before <paramref name="cutoffUtc"/>, oldest first, locked with SKIP LOCKED, with payments.</summary>
    Task<IReadOnlyList<Order>> LockExpirableAsync(DateTime cutoffUtc, int batchSize, CancellationToken cancellationToken);
}
