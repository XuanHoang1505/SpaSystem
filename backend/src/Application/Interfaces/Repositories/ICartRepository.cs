using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

public interface ICartRepository : IRepository<Cart>
{
    /// <summary>The customer's cart rows, oldest first, priced and checked for visibility (BR-CAT-01) on <paramref name="today"/>.</summary>
    Task<IReadOnlyList<CartLine>> GetLinesAsync(Guid customerId, DateOnly today, CancellationToken cancellationToken);

    /// <summary>The customer's cart id, creating the cart if needed; safe when two requests create it at once.</summary>
    Task<Guid> EnsureCartIdAsync(Guid customerId, DateTime nowUtc, CancellationToken cancellationToken);

    Task<int> CountItemsAsync(Guid cartId, CancellationToken cancellationToken);

    Task<bool> HasProductAsync(Guid cartId, Guid? spaServiceId, Guid? servicePackageId, CancellationToken cancellationToken);

    /// <summary>Tracked row, only when it belongs to the customer's cart.</summary>
    Task<CartItem?> GetItemAsync(Guid customerId, Guid itemId, CancellationToken cancellationToken);

    void AddItem(CartItem item);

    void RemoveItem(CartItem item);

    /// <summary>Deletes the customer's cart rows for these products right away (bought products, BR-ORD-06).</summary>
    Task RemoveProductsAsync(Guid customerId, IReadOnlyCollection<Guid> spaServiceIds, IReadOnlyCollection<Guid> servicePackageIds,
        CancellationToken cancellationToken);
}
