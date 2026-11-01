using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Application.Interfaces.Services.Treatments;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>
/// Treatment plan management: UC-SPA-21, docs/specs/purchases-treatments.md. The owner sees every plan, staff their own (scope checked in
/// Application); assign-staff, pause, resume, cancel and complete are owner only (<c>403 forbidden</c> for staff).
/// </summary>
[Route("api/v1/treatments")]
[Authorize(Policy = Permissions.TreatmentManage)]
public sealed class TreatmentsController : ApiController
{
    private readonly ITreatmentManagementService _treatments;

    public TreatmentsController(ITreatmentManagementService treatments) => _treatments = treatments;

    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResult<TreatmentPlanListItemDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List([FromQuery] PagedQuery paging, [FromQuery] TreatmentListQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _treatments.ListAsync(paging, query, cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<TreatmentPlanDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _treatments.GetAsync(id, cancellationToken));

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ApiResponse<TreatmentPlanDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTreatmentPlanRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _treatments.UpdateAsync(id, request, cancellationToken));

    [HttpPut("{id:guid}/sessions/{sessionId:guid}")]
    [ProducesResponseType<ApiResponse<TreatmentSessionDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateSession(
        Guid id, Guid sessionId, [FromBody] UpdateTreatmentSessionRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _treatments.UpdateSessionAsync(id, sessionId, request, cancellationToken));

    [HttpPost("{id:guid}/assign-staff")]
    [ProducesResponseType<ApiResponse<TreatmentPlanDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AssignStaff(Guid id, [FromBody] AssignTreatmentStaffRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _treatments.AssignStaffAsync(id, request, cancellationToken));

    [HttpPost("{id:guid}/pause")]
    [ProducesResponseType<ApiResponse<TreatmentPlanDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Pause(Guid id, [FromBody] TreatmentReasonRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _treatments.PauseAsync(id, request, cancellationToken));

    [HttpPost("{id:guid}/resume")]
    [ProducesResponseType<ApiResponse<TreatmentPlanDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Resume(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _treatments.ResumeAsync(id, cancellationToken));

    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType<ApiResponse<TreatmentPlanDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] TreatmentReasonRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _treatments.CancelAsync(id, request, cancellationToken));

    [HttpPost("{id:guid}/complete")]
    [ProducesResponseType<ApiResponse<TreatmentPlanDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Complete(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _treatments.CompleteAsync(id, cancellationToken));
}
