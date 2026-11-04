using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class CartRepository : Repository<Cart>, ICartRepository
{
    public CartRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<CartLine>> GetLinesAsync(Guid customerId, DateOnly today, CancellationToken cancellationToken) =>
        await Context.CartItems.AsNoTracking()
            .Where(item => item.Cart.CustomerId == customerId)
            .OrderBy(item => item.AddedAtUtc).ThenBy(item => item.Id)
            .Select(item => new CartLine(
                item.Id,
                item.SpaServiceId != null ? CatalogItemType.Service : CatalogItemType.Package,
                item.SpaServiceId ?? item.ServicePackageId!.Value,
                item.SpaService != null ? item.SpaService.Name : item.ServicePackage!.Name,
                // Package image falls back to the first item's service image like the catalog (BR-CAT-07).
                item.SpaService != null
                    ? item.SpaService.ImageUrl
                    : item.ServicePackage!.ImageUrl ?? item.ServicePackage.Items.Where(packageItem => packageItem.SpaService.ImageUrl != null)
                        .OrderBy(packageItem => packageItem.SortOrder).Select(packageItem => packageItem.SpaService.ImageUrl).FirstOrDefault(),
                item.UnitPrice,
                item.SpaService != null ? item.SpaService.Price : item.ServicePackage!.Price,
                // BR-CAT-01 as the customer sees it today.
                item.SpaService != null
                    ? item.SpaService.Status == CatalogStatus.OnSale
                    : item.ServicePackage!.Status == CatalogStatus.OnSale &&
                      (item.ServicePackage.SaleStartDate == null || item.ServicePackage.SaleStartDate <= today) &&
                      (item.ServicePackage.SaleEndDate == null || item.ServicePackage.SaleEndDate >= today),
                item.AddedAtUtc))
            .ToListAsync(cancellationToken);

    public async Task<Guid> EnsureCartIdAsync(Guid customerId, DateTime nowUtc, CancellationToken cancellationToken)
    {
        // INSERT … ON CONFLICT so two first adds at the same moment both end up with the one cart (carts.customer_id is unique).
        await Context.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO carts (id, customer_id, created_at_utc, created_by) VALUES ({Guid.NewGuid()}, {customerId}, {nowUtc}, {customerId}) ON CONFLICT (customer_id) DO NOTHING",
            cancellationToken);
        return await Set.AsNoTracking().Where(cart => cart.CustomerId == customerId).Select(cart => cart.Id).SingleAsync(cancellationToken);
    }

    public Task<int> CountItemsAsync(Guid cartId, CancellationToken cancellationToken) =>
        Context.CartItems.CountAsync(item => item.CartId == cartId, cancellationToken);

    public Task<bool> HasProductAsync(Guid cartId, Guid? spaServiceId, Guid? servicePackageId, CancellationToken cancellationToken) =>
        Context.CartItems.AnyAsync(item => item.CartId == cartId &&
                                           (spaServiceId != null && item.SpaServiceId == spaServiceId ||
                                            servicePackageId != null && item.ServicePackageId == servicePackageId), cancellationToken);

    public Task<CartItem?> GetItemAsync(Guid customerId, Guid itemId, CancellationToken cancellationToken) =>
        Context.CartItems.FirstOrDefaultAsync(item => item.Id == itemId && item.Cart.CustomerId == customerId, cancellationToken);

    public void AddItem(CartItem item) => Context.CartItems.Add(item);

    public void RemoveItem(CartItem item) => Context.CartItems.Remove(item);

    public Task RemoveProductsAsync(Guid customerId, IReadOnlyCollection<Guid> spaServiceIds, IReadOnlyCollection<Guid> servicePackageIds,
        CancellationToken cancellationToken) =>
        Context.CartItems
            .Where(item => item.Cart.CustomerId == customerId &&
                           (item.SpaServiceId != null && spaServiceIds.Contains(item.SpaServiceId.Value) ||
                            item.ServicePackageId != null && servicePackageIds.Contains(item.ServicePackageId.Value)))
            .ExecuteDeleteAsync(cancellationToken);
}
