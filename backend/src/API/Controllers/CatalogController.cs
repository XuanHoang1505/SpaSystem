using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>Search across services and packages (UC-SPA-06 A1).</summary>
[Route("api/v1/catalog")]
public sealed class CatalogController : ApiController
{
    private readonly ICatalogSearchService _search;

    public CatalogController(ICatalogSearchService search) => _search = search;

    [HttpGet("suggestions")]
    [AllowAnonymous]
    [ProducesResponseType<ApiResponse<IReadOnlyList<CatalogSuggestionDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Suggestions([FromQuery] SuggestionQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _search.SuggestAsync(query, cancellationToken));
}
