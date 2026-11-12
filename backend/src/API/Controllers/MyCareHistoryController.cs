using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.Interfaces.Services.Care;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>
/// UC-SPA-26: the visits the signed-in staff member completed (docs/specs/care.md); the detail is <c>GET /appointments/{id}</c>
/// and its skin profile. <c>care.write</c> per RBAC sheet 21.
/// </summary>
[Route("api/v1/me/care-history")]
[Authorize(Policy = Permissions.CareWrite)]
public sealed class MyCareHistoryController : ApiController
{
    private readonly ICareHistoryService _history;

    public MyCareHistoryController(ICareHistoryService history) => _history = history;

    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResult<CareHistoryItemDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List([FromQuery] PagedQuery paging, [FromQuery] CareHistoryQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _history.ListAsync(paging, query, cancellationToken));
}
