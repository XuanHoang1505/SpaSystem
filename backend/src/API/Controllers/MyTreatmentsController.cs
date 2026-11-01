using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Application.Interfaces.Services.Treatments;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>The signed-in customer's treatment plans: UC-SPA-19, docs/specs/purchases-treatments.md.</summary>
[Route("api/v1/me/treatments")]
[Authorize(Policy = Permissions.PurchaseSelf)]
public sealed class MyTreatmentsController : ApiController
{
    private readonly IMyTreatmentService _treatments;

    public MyTreatmentsController(IMyTreatmentService treatments) => _treatments = treatments;

    [HttpGet]
    [ProducesResponseType<ApiResponse<IReadOnlyList<MyTreatmentListItemDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List([FromQuery] string? status, CancellationToken cancellationToken) =>
        HandleResult(await _treatments.ListAsync(new MyTreatmentListQuery(status), cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<MyTreatmentPlanDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _treatments.GetAsync(id, cancellationToken));

    [HttpGet("{id:guid}/sessions/{sessionId:guid}")]
    [ProducesResponseType<ApiResponse<MyTreatmentSessionDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSession(Guid id, Guid sessionId, CancellationToken cancellationToken) =>
        HandleResult(await _treatments.GetSessionAsync(id, sessionId, cancellationToken));
}
