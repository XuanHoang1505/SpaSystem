using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Interfaces.Services.Catalog;

/// <summary>Service packages: UC-SPA-06, 07 (read) and UC-SPA-09 (owner writes), docs/specs/catalog.md.</summary>
public interface IPackageCatalogService
{
    Task<OperationResult<PagedResult<PackageListItemDto>>> SearchAsync(PagedQuery query, PackageFilter filter, CancellationToken cancellationToken);
    Task<OperationResult<PackageDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<OperationResult<PackageDetailDto>> CreateAsync(CreatePackageRequest request, CancellationToken cancellationToken);
    Task<OperationResult<PackageDetailDto>> UpdateAsync(Guid id, UpdatePackageRequest request, CancellationToken cancellationToken);
    Task ChangeStatusAsync(Guid id, ChangeCatalogStatusRequest request, CancellationToken cancellationToken);
}
