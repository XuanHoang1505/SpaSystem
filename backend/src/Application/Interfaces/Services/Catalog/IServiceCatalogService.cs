using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Interfaces.Services.Catalog;

/// <summary>Spa services: UC-SPA-06, 07 (read) and UC-SPA-09 (owner writes), docs/specs/catalog.md.</summary>
public interface IServiceCatalogService
{
    Task<OperationResult<PagedResult<ServiceListItemDto>>> SearchAsync(PagedQuery query, ServiceFilter filter, CancellationToken cancellationToken);
    Task<OperationResult<ServiceDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<OperationResult<ServiceDetailDto>> CreateAsync(CreateServiceRequest request, CancellationToken cancellationToken);
    Task<OperationResult<ServiceDetailDto>> UpdateAsync(Guid id, UpdateServiceRequest request, CancellationToken cancellationToken);
    Task ChangeStatusAsync(Guid id, ChangeCatalogStatusRequest request, CancellationToken cancellationToken);
}
