using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;
using NhuNguyetSpa.Application.Interfaces.Services.WorkSchedules;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>Work shifts: UC-SPA-23 (owner), docs/specs/staff.md. Times are Vietnam local HH:mm.</summary>
[Route("api/v1/work-schedules")]
[Authorize(Policy = Permissions.ScheduleManage)]
public sealed class WorkSchedulesController : ApiController
{
    private readonly IWorkScheduleService _shifts;

    public WorkSchedulesController(IWorkScheduleService shifts) => _shifts = shifts;

    [HttpGet]
    [ProducesResponseType<ApiResponse<IReadOnlyList<WorkScheduleDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List([FromQuery] WorkScheduleQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _shifts.ListAsync(query, cancellationToken));

    [HttpPost]
    [ProducesResponseType<ApiResponse<WorkScheduleDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(CreateWorkScheduleRequest request, CancellationToken cancellationToken)
    {
        var result = await _shifts.CreateAsync(request, cancellationToken);
        // No GET by id exists yet (UC-SPA-24 adds /me/work-schedules/{id}), so Location is the resource path itself.
        Response.Headers.Location = $"/api/v1/work-schedules/{result.Data!.Id}";
        return HandleResult(result, StatusCodes.Status201Created);
    }

    /// <summary>A4 / BR-STF-09: one shift per selected weekday in the range for each staff member; invalid shifts are skipped with a reason.</summary>
    [HttpPost("batch")]
    [ProducesResponseType<ApiResponse<WorkScheduleBatchResultDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateBatch(CreateWorkScheduleBatchRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _shifts.CreateBatchAsync(request, cancellationToken));

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ApiResponse<WorkScheduleDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, UpdateWorkScheduleRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _shifts.UpdateAsync(id, request, cancellationToken));

    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeWorkScheduleStatusRequest request, CancellationToken cancellationToken)
    {
        await _shifts.ChangeStatusAsync(id, request, cancellationToken);
        return NoContent();
    }
}
