using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>Distinct service categories for the search filter (UC-SPA-06).</summary>
[Route("api/v1/service-categories")]
public sealed class ServiceCategoriesController : ApiController
{
    private readonly ICatalogSearchService _search;

    public ServiceCategoriesController(ICatalogSearchService search) => _search = search;

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<ApiResponse<IReadOnlyList<string>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken) => HandleResult(await _search.GetCategoriesAsync(cancellationToken));
}
