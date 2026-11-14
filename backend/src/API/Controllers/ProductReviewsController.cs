using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Reviews;
using NhuNguyetSpa.Application.Interfaces.Services.Reviews;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>UC-SPA-29: visible reviews of a service or package, for everyone (docs/specs/reviews.md).</summary>
[AllowAnonymous]
public sealed class ProductReviewsController : ApiController
{
    private readonly IProductReviewService _reviews;

    public ProductReviewsController(IProductReviewService reviews) => _reviews = reviews;

    [HttpGet("~/api/v1/services/{id:guid}/reviews")]
    [ProducesResponseType<ApiResponse<ProductReviewsDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ForService(
        Guid id, [FromQuery] PagedQuery query, [FromQuery] ProductReviewFilter filter, CancellationToken cancellationToken) =>
        HandleResult(await _reviews.GetForServiceAsync(id, query, filter, cancellationToken));

    [HttpGet("~/api/v1/packages/{id:guid}/reviews")]
    [ProducesResponseType<ApiResponse<ProductReviewsDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ForPackage(
        Guid id, [FromQuery] PagedQuery query, [FromQuery] ProductReviewFilter filter, CancellationToken cancellationToken) =>
        HandleResult(await _reviews.GetForPackageAsync(id, query, filter, cancellationToken));
}
