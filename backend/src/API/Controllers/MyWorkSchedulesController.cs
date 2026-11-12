using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;
using NhuNguyetSpa.Application.Interfaces.Services.WorkSchedules;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>UC-SPA-24: the signed-in staff member's own shifts (docs/specs/staff.md); the owner uses <c>/work-schedules</c>.</summary>
[Route("api/v1/me/work-schedules")]
[Authorize(Policy = Permissions.ScheduleSelf)]
public sealed class MyWorkSchedulesController : ApiController
{
    private readonly IMyWorkScheduleService _shifts;

    public MyWorkSchedulesController(IMyWorkScheduleService shifts) => _shifts = shifts;

    [HttpGet]
    [ProducesResponseType<ApiResponse<IReadOnlyList<MyWorkScheduleDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List([FromQuery] MyWorkScheduleQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _shifts.ListAsync(query, cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<MyWorkScheduleDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _shifts.GetAsync(id, cancellationToken));
}
