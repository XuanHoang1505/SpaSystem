using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Reviews;
using NhuNguyetSpa.Application.Interfaces.Services.Reviews;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>UC-SPA-31: the owner manages reviews (docs/specs/reviews.md).</summary>
[Route("api/v1/reviews")]
[Authorize(Policy = Permissions.ReviewManage)]
public sealed class ReviewsController : ApiController
{
    private readonly IReviewManagementService _reviews;

    public ReviewsController(IReviewManagementService reviews) => _reviews = reviews;

    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResult<OwnerReviewDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search([FromQuery] PagedQuery query, [FromQuery] OwnerReviewFilter filter, CancellationToken cancellationToken) =>
        HandleResult(await _reviews.SearchAsync(query, filter, cancellationToken));

    [HttpPost("{id:guid}/reply")]
    [ProducesResponseType<ApiResponse<OwnerReviewDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Reply(Guid id, ReplyReviewRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _reviews.ReplyAsync(id, request, cancellationToken));

    [HttpDelete("{id:guid}/reply")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveReply(Guid id, CancellationToken cancellationToken)
    {
        await _reviews.RemoveReplyAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/visibility")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChangeVisibility(Guid id, ChangeReviewVisibilityRequest request, CancellationToken cancellationToken)
    {
        await _reviews.ChangeVisibilityAsync(id, request, cancellationToken);
        return NoContent();
    }
}
