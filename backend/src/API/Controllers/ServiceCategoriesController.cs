using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>Service categories (Q-13): list for everyone (UC-SPA-06), manage for the owner (UC-SPA-09).</summary>
[Route("api/v1/service-categories")]
public sealed class ServiceCategoriesController : ApiController
{
    private readonly IServiceCategoryService _categories;

    public ServiceCategoriesController(IServiceCategoryService categories) => _categories = categories;

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<ApiResponse<IReadOnlyList<ServiceCategoryDto>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken) => HandleResult(await _categories.ListAsync(cancellationToken));

    [HttpPost]
    [Authorize(Policy = Permissions.CatalogManage)]
    [ProducesResponseType<ApiResponse<ServiceCategoryDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(CreateServiceCategoryRequest request, CancellationToken cancellationToken)
    {
        var result = await _categories.CreateAsync(request, cancellationToken);
        Response.Headers.Location = Url.Action(nameof(List)) + "/" + result.Data!.Id;
        return HandleResult(result, StatusCodes.Status201Created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.CatalogManage)]
    [ProducesResponseType<ApiResponse<ServiceCategoryDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, UpdateServiceCategoryRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _categories.UpdateAsync(id, request, cancellationToken));

    /// <summary>Only an empty category can be deleted (BR-CAT-13); otherwise hide it with PUT.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.CatalogManage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _categories.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
