using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.DTOs.Payments;
using NhuNguyetSpa.Application.Interfaces.Services.Orders;
using NhuNguyetSpa.Application.Interfaces.Services.Payments;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>The signed-in customer's orders and payment attempts: UC-SPA-11, docs/specs/orders.md.</summary>
[Route("api/v1/me/orders")]
[Authorize(Policy = Permissions.OrderSelf)]
public sealed class MyOrdersController : ApiController
{
    public const string IdempotencyHeader = "Idempotency-Key";

    private readonly IOrderService _orders;
    private readonly IPaymentService _payments;

    public MyOrdersController(IOrderService orders, IPaymentService payments)
    {
        _orders = orders;
        _payments = payments;
    }

    /// <summary>Totals with current prices and the promotion result; writes nothing.</summary>
    [HttpPost("preview")]
    [ProducesResponseType<ApiResponse<OrderPreviewDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Preview(OrderRequest request, CancellationToken cancellationToken)
    {
        return HandleResult(await _orders.PreviewAsync(request, cancellationToken));
    }

    /// <summary>201 for a new order; 200 with the earlier order when the same <c>Idempotency-Key</c> is sent again (BR-ORD-08).</summary>
    [HttpPost]
    [ProducesResponseType<ApiResponse<OrderDetailDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<OrderDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Create(
        OrderRequest request, [FromHeader(Name = IdempotencyHeader)] string? idempotencyKey, CancellationToken cancellationToken)
    {
        Guid? key = null;
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            if (!Guid.TryParse(idempotencyKey, out var parsed))
            {
                var failures = new List<ValidationFailure>
                {
                    new ValidationFailure(IdempotencyHeader, "Idempotency-Key phải là một UUID.") { ErrorCode = "validation_error" },
                };
                throw new ValidationException(failures);
            }
            key = parsed;
        }

        var result = await _orders.CreateAsync(request, key, cancellationToken);
        var order = result.Data!;
        Response.Headers.Location = Url.Action(nameof(Get), new { id = order.Order.Id });
        return HandleResult(Application.Common.Models.OperationResult<OrderDetailDto>.Success(order.Order),
            order.Created ? StatusCodes.Status201Created : StatusCodes.Status200OK);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<OrderDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        return HandleResult(await _orders.GetAsync(id, cancellationToken));
    }

    /// <summary>A new payment attempt with a signed gateway URL (A2: a retry is a new attempt).</summary>
    [HttpPost("{id:guid}/payments")]
    [ProducesResponseType<ApiResponse<PaymentAttemptDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> CreatePayment(Guid id, CreatePaymentRequest? request, CancellationToken cancellationToken)
    {
        var clientIp = ClientIpAddress.Format(HttpContext.Connection.RemoteIpAddress);
        return HandleResult(await _payments.CreateAttemptAsync(id, request ?? new CreatePaymentRequest(null), clientIp, cancellationToken),
            StatusCodes.Status201Created);
    }
}
