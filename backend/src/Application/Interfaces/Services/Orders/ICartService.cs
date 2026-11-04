using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Orders;

namespace NhuNguyetSpa.Application.Interfaces.Services.Orders;

/// <summary>UC-SPA-10: the signed-in customer's cart (docs/specs/orders.md).</summary>
public interface ICartService
{
    Task<OperationResult<CartDto>> GetAsync(CancellationToken cancellationToken);

    Task<OperationResult<CartDto>> AddItemAsync(AddCartItemRequest request, CancellationToken cancellationToken);

    Task<OperationResult<CartDto>> RemoveItemAsync(Guid itemId, CancellationToken cancellationToken);
}
