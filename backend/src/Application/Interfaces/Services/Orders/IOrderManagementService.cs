using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Orders;

namespace NhuNguyetSpa.Application.Interfaces.Services.Orders;

/// <summary>UC-SPA-13: the owner searches, reads and cancels orders (docs/specs/orders.md, BR-ORD-04, 11, 12).</summary>
public interface IOrderManagementService
{
    Task<OperationResult<PagedResult<OrderListItemDto>>> ListAsync(PagedQuery paging, OrderListQuery query, CancellationToken cancellationToken);

    Task<OperationResult<OwnerOrderDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken);

    Task<OperationResult<OwnerOrderDetailDto>> CancelAsync(Guid id, CancelOrderRequest request, CancellationToken cancellationToken);
}
