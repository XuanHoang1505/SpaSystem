using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Promotions;
using NhuNguyetSpa.Application.Interfaces.Services.Promotions;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>Promotions: UC-SPA-14 (owner), docs/specs/orders.md. Never deleted, only stopped.</summary>
[Route("api/v1/promotions")]
[Authorize(Policy = Permissions.PromotionManage)]
public sealed class PromotionsController : ApiController
{
    private readonly IPromotionService _promotions;

    public PromotionsController(IPromotionService promotions)
    {
        _promotions = promotions;
    }

    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResult<PromotionDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Search([FromQuery] PagedQuery query, [FromQuery] PromotionFilter filter, CancellationToken cancellationToken)
    {
        return HandleResult(await _promotions.SearchAsync(query, filter, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<PromotionDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        return HandleResult(await _promotions.GetAsync(id, cancellationToken));
    }

    [HttpPost]
    [ProducesResponseType<ApiResponse<PromotionDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(SavePromotionRequest request, CancellationToken cancellationToken)
    {
        var result = await _promotions.CreateAsync(request, cancellationToken);
        Response.Headers.Location = Url.Action(nameof(Get), new { id = result.Data!.Id });
        return HandleResult(result, StatusCodes.Status201Created);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ApiResponse<PromotionDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, SavePromotionRequest request, CancellationToken cancellationToken)
    {
        return HandleResult(await _promotions.UpdateAsync(id, request, cancellationToken));
    }

    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangePromotionStatusRequest request, CancellationToken cancellationToken)
    {
        await _promotions.ChangeStatusAsync(id, request, cancellationToken);
        return NoContent();
    }
}
