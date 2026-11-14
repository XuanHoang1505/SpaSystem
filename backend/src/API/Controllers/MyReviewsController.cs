using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Reviews;
using NhuNguyetSpa.Application.Interfaces.Services.Reviews;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>UC-SPA-30: the signed-in customer's reviews (docs/specs/reviews.md). The customer is always the caller.</summary>
[Route("api/v1/me/reviews")]
[Authorize(Policy = Permissions.ReviewWrite)]
public sealed class MyReviewsController : ApiController
{
    private readonly IMyReviewService _reviews;

    public MyReviewsController(IMyReviewService reviews) => _reviews = reviews;

    [HttpGet("~/api/v1/me/reviewable")]
    [ProducesResponseType<ApiResponse<IReadOnlyList<ReviewableProductDto>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Reviewable(CancellationToken cancellationToken) =>
        HandleResult(await _reviews.ListReviewableAsync(cancellationToken));

    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResult<MyReviewDto>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] PagedQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _reviews.ListMineAsync(query, cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<MyReviewDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _reviews.GetMineAsync(id, cancellationToken));

    [HttpPost]
    [ProducesResponseType<ApiResponse<MyReviewDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(CreateReviewRequest request, CancellationToken cancellationToken)
    {
        var result = await _reviews.CreateAsync(request, cancellationToken);
        Response.Headers.Location = Url.Action(nameof(Get), new { id = result.Data!.Id });
        return HandleResult(result, StatusCodes.Status201Created);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ApiResponse<MyReviewDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, UpdateReviewRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _reviews.UpdateAsync(id, request, cancellationToken));

    [HttpPost("{id:guid}/image")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ImageUploadOptions.HardLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = ImageUploadOptions.HardLimitBytes)]
    [ProducesResponseType<ApiResponse<MyReviewDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> UploadImage(Guid id, IFormFile? file, CancellationToken cancellationToken)
    {
        await using var content = file?.OpenReadStream();
        return HandleResult(await _reviews.UploadImageAsync(id, new ImageUploadRequest(content, file?.Length ?? 0), cancellationToken));
    }

    [HttpDelete("{id:guid}/image")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> DeleteImage(Guid id, CancellationToken cancellationToken)
    {
        await _reviews.DeleteImageAsync(id, cancellationToken);
        return NoContent();
    }
}
