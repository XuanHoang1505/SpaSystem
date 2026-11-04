using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Services.Orders;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>The signed-in customer's cart: UC-SPA-10, docs/specs/orders.md.</summary>
[Route("api/v1/me/cart")]
[Authorize(Policy = Permissions.CartSelf)]
public sealed class MyCartController : ApiController
{
    private readonly ICartService _cart;

    public MyCartController(ICartService cart)
    {
        _cart = cart;
    }

    [HttpGet]
    [ProducesResponseType<ApiResponse<CartDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        return HandleResult(await _cart.GetAsync(cancellationToken));
    }

    [HttpPost("items")]
    [ProducesResponseType<ApiResponse<CartDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AddItem(AddCartItemRequest request, CancellationToken cancellationToken)
    {
        var result = await _cart.AddItemAsync(request, cancellationToken);
        Response.Headers.Location = "/api/v1/me/cart";
        return HandleResult(result, StatusCodes.Status201Created);
    }

    [HttpDelete("items/{itemId:guid}")]
    [ProducesResponseType<ApiResponse<CartDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveItem(Guid itemId, CancellationToken cancellationToken)
    {
        return HandleResult(await _cart.RemoveItemAsync(itemId, cancellationToken));
    }
}
