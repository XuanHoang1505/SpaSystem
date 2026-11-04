using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Purchases;

namespace NhuNguyetSpa.Application.Interfaces.Services.Purchases;

/// <summary>UC-SPA-18: the signed-in customer's bought services and packages (docs/specs/purchases-treatments.md).</summary>
public interface IPurchaseService
{
    Task<OperationResult<PurchasesDto>> ListAsync(PurchaseListQuery query, CancellationToken cancellationToken);

    Task<OperationResult<PurchasedServiceDto>> GetServiceAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>With per-service progress (<c>items</c>).</summary>
    Task<OperationResult<PurchasedPackageDto>> GetPackageAsync(Guid id, CancellationToken cancellationToken);
}
