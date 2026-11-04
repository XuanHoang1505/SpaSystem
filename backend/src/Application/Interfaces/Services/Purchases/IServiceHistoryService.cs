using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Purchases;

namespace NhuNguyetSpa.Application.Interfaces.Services.Purchases;

/// <summary>UC-SPA-20: the signed-in customer's completed and no-show visits.</summary>
public interface IServiceHistoryService
{
    Task<OperationResult<PagedResult<ServiceHistoryItemDto>>> ListAsync(PagedQuery paging, ServiceHistoryQuery query, CancellationToken cancellationToken);

    Task<OperationResult<ServiceHistoryDetailDto>> GetAsync(Guid appointmentId, CancellationToken cancellationToken);
}
