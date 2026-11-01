using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Orders;

namespace NhuNguyetSpa.Application.Interfaces.Services.Orders;

/// <summary>UC-SPA-11, 12: preview, create, list, read and cancel the signed-in customer's orders (docs/specs/orders.md).</summary>
public interface IOrderService
{
    Task<OperationResult<OrderPreviewDto>> PreviewAsync(OrderRequest request, CancellationToken cancellationToken);

    Task<OperationResult<CreatedOrder>> CreateAsync(OrderRequest request, Guid? idempotencyKey, CancellationToken cancellationToken);

    Task<OperationResult<OrderDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>BR-ORD-11: newest first; <c>search</c> and <c>sortBy</c> of <paramref name="paging"/> are not used.</summary>
    Task<OperationResult<PagedResult<MyOrderListItemDto>>> ListAsync(PagedQuery paging, OrderListQuery query, CancellationToken cancellationToken);

    /// <summary>BR-ORD-04, 12: cancels an unpaid order with its held appointment; returns the order afterwards.</summary>
    Task<OperationResult<OrderDetailDto>> CancelAsync(Guid id, CancelOrderRequest request, CancellationToken cancellationToken);
}
