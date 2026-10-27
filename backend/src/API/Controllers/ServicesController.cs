using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>Spa services: UC-SPA-06/07 (everyone) and UC-SPA-09 (owner), docs/specs/catalog.md.</summary>
[Route("api/v1/services")]
public sealed class ServicesController : ApiController
{
    private readonly IServiceCatalogService _services;
    private readonly ICatalogImageService _images;

    public ServicesController(IServiceCatalogService services, ICatalogImageService images)
    {
        _services = services;
        _images = images;
    }

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<ApiResponse<PagedResult<ServiceListItemDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search([FromQuery] PagedQuery query, [FromQuery] ServiceFilter filter, CancellationToken cancellationToken) =>
        HandleResult(await _services.SearchAsync(query, filter, cancellationToken));

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType<ApiResponse<ServiceDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _services.GetAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Policy = Permissions.CatalogManage)]
    [ProducesResponseType<ApiResponse<ServiceDetailDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Create(CreateServiceRequest request, CancellationToken cancellationToken)
    {
        var result = await _services.CreateAsync(request, cancellationToken);
        Response.Headers.Location = Url.Action(nameof(Get), new { id = result.Data!.Id });
        return HandleResult(result, StatusCodes.Status201Created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.CatalogManage)]
    [ProducesResponseType<ApiResponse<ServiceDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, UpdateServiceRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _services.UpdateAsync(id, request, cancellationToken));

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = Permissions.CatalogManage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeCatalogStatusRequest request, CancellationToken cancellationToken)
    {
        await _services.ChangeStatusAsync(id, request, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/image")]
    [Authorize(Policy = Permissions.CatalogManage)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ImageUploadOptions.HardLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = ImageUploadOptions.HardLimitBytes)]
    [ProducesResponseType<ApiResponse<ImageUrlDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> UploadImage(Guid id, IFormFile? file, CancellationToken cancellationToken)
    {
        await using var content = file?.OpenReadStream();
        return HandleResult(await _images.UploadServiceImageAsync(id, new ImageUploadRequest(content, file?.Length ?? 0), cancellationToken));
    }

    [HttpDelete("{id:guid}/image")]
    [Authorize(Policy = Permissions.CatalogManage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> DeleteImage(Guid id, CancellationToken cancellationToken)
    {
        await _images.DeleteServiceImageAsync(id, cancellationToken);
        return NoContent();
    }
}
