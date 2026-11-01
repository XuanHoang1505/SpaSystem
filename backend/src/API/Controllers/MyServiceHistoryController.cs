using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.Interfaces.Services.Purchases;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>The signed-in customer's past visits: UC-SPA-20, docs/specs/purchases-treatments.md.</summary>
[Route("api/v1/me/service-history")]
[Authorize(Policy = Permissions.PurchaseSelf)]
public sealed class MyServiceHistoryController : ApiController
{
    private readonly IServiceHistoryService _history;

    public MyServiceHistoryController(IServiceHistoryService history) => _history = history;

    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResult<ServiceHistoryItemDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List([FromQuery] PagedQuery paging, [FromQuery] ServiceHistoryQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _history.ListAsync(paging, query, cancellationToken));

    [HttpGet("{appointmentId:guid}")]
    [ProducesResponseType<ApiResponse<ServiceHistoryDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid appointmentId, CancellationToken cancellationToken) =>
        HandleResult(await _history.GetAsync(appointmentId, cancellationToken));
}
