using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Services.Orders;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>The owner's order management: UC-SPA-13, docs/specs/orders.md. Orders are never deleted; unpaid ones are cancelled with a reason.</summary>
[Route("api/v1/orders")]
[Authorize(Policy = Permissions.OrderManage)]
public sealed class OrdersController : ApiController
{
    private readonly IOrderManagementService _orders;

    public OrdersController(IOrderManagementService orders) => _orders = orders;

    /// <summary><c>search</c>: order code or customer name/phone/email; <c>sortBy</c>: createdAtUtc (default, newest first) or grandTotal.</summary>
    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResult<OrderListItemDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List([FromQuery] PagedQuery paging, [FromQuery] OrderListQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _orders.ListAsync(paging, query, cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<OwnerOrderDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _orders.GetAsync(id, cancellationToken));

    /// <summary>Cancels an unpaid order and its held appointment (BR-ORD-04, 12); the reason is required.</summary>
    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType<ApiResponse<OwnerOrderDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cancel(Guid id, CancelOrderRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _orders.CancelAsync(id, request, cancellationToken));
}
