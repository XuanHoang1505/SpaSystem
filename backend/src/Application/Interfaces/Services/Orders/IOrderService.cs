using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Orders;

namespace NhuNguyetSpa.Application.Interfaces.Services.Orders;

/// <summary>UC-SPA-11: preview, create and read the signed-in customer's orders (docs/specs/orders.md).</summary>
public interface IOrderService
{
    Task<OperationResult<OrderPreviewDto>> PreviewAsync(OrderRequest request, CancellationToken cancellationToken);

    Task<OperationResult<CreatedOrder>> CreateAsync(OrderRequest request, Guid? idempotencyKey, CancellationToken cancellationToken);

    Task<OperationResult<OrderDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken);
}
