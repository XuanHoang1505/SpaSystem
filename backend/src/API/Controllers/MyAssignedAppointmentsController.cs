using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Interfaces.Services.Staff;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>UC-SPA-25: the signed-in staff member's assigned appointments (docs/specs/staff.md); the detail is <c>GET /appointments/{id}</c>.</summary>
[Route("api/v1/me/assigned-appointments")]
[Authorize(Policy = Permissions.ScheduleSelf)]
public sealed class MyAssignedAppointmentsController : ApiController
{
    private readonly IAssignedAppointmentService _appointments;

    public MyAssignedAppointmentsController(IAssignedAppointmentService appointments) => _appointments = appointments;

    [HttpGet]
    [ProducesResponseType<ApiResponse<IReadOnlyList<AssignedAppointmentDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List([FromQuery] AssignedAppointmentQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _appointments.ListAsync(query, cancellationToken));
}
