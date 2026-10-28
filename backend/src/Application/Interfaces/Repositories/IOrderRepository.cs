using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

public interface IOrderRepository : IRepository<Order>
{
    /// <summary>The customer's order, or null when missing or someone else's. <c>IsPayable</c> is left false for the service to fill.</summary>
    Task<OrderDetailDto?> GetDetailAsync(Guid id, Guid customerId, CancellationToken cancellationToken);

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
