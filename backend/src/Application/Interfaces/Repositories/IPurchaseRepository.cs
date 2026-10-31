using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>
/// Bought services and packages of one customer (UC-SPA-18) and the reads booking with them needs (UC-SPA-15 flow 2). Every method
/// takes the customer id: rows of other customers are never returned (BR-SEC-01).
/// </summary>
public interface IPurchaseRepository
{
    /// <summary>Tracked entitlement plus the service bought on its order line; null when missing or someone else's.</summary>
    Task<(ServiceEntitlement Entitlement, Guid SpaServiceId)?> GetEntitlementForBookingAsync(Guid id, Guid customerId, CancellationToken cancellationToken);

    /// <summary>A fresh (never cached) read of what BR-BKG-05 needs for the session; null when missing or someone else's.</summary>
    Task<SessionBookingFacts?> GetSessionFactsAsync(Guid sessionId, Guid customerId, CancellationToken cancellationToken);

    Task<TreatmentSession?> GetSessionForUpdateAsync(Guid sessionId, CancellationToken cancellationToken);

    /// <summary>Newest first, at most <paramref name="max"/>.</summary>
    Task<IReadOnlyList<PurchasedServiceRow>> ListServicesAsync(Guid customerId, int max, CancellationToken cancellationToken);

    /// <summary>Newest first, at most <paramref name="max"/>, without <c>Items</c>.</summary>
    Task<IReadOnlyList<PurchasedPackageRow>> ListPackagesAsync(Guid customerId, int max, CancellationToken cancellationToken);

    Task<PurchasedServiceRow?> GetServiceAsync(Guid id, Guid customerId, CancellationToken cancellationToken);

    Task<PurchasedPackageRow?> GetPackageAsync(Guid id, Guid customerId, bool withItems, CancellationToken cancellationToken);
}
