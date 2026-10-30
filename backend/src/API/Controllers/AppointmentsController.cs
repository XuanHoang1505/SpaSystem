using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Services.Bookings;
using SecurityRoles = NhuNguyetSpa.Application.Common.Security.Roles;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>
/// Appointments: UC-SPA-17 (owner) and the assigned staff member's detail view, docs/specs/bookings.md. There is no delete:
/// appointments are cancelled with a reason. Dates yyyy-MM-dd, times Vietnam HH:mm.
/// </summary>
// [Authorize] attributes add up (AND), so the owner policy sits on each action and the detail view uses roles instead.
[Route("api/v1/appointments")]
[Authorize]
public sealed class AppointmentsController : ApiController
{
    private readonly IAppointmentManagementService _appointments;

    public AppointmentsController(IAppointmentManagementService appointments) => _appointments = appointments;

    [HttpGet]
    [Authorize(Policy = Permissions.AppointmentManage)]
    [ProducesResponseType<ApiResponse<PagedResult<AppointmentListItemDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List([FromQuery] PagedQuery paging, [FromQuery] AppointmentListQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _appointments.ListAsync(paging, query, cancellationToken));

    /// <summary>Owner, or the staff member assigned to the appointment (checked by the service, BR-SEC-01).</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = $"{SecurityRoles.Owner},{SecurityRoles.Staff}")]
    [ProducesResponseType<ApiResponse<AppointmentDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _appointments.GetAsync(id, cancellationToken));

    [HttpPost("{id:guid}/confirm")]
    [Authorize(Policy = Permissions.AppointmentManage)]
    [ProducesResponseType<ApiResponse<AppointmentDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Confirm(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _appointments.ConfirmAsync(id, cancellationToken));

    [HttpPost("{id:guid}/reschedule")]
    [Authorize(Policy = Permissions.AppointmentManage)]
    [ProducesResponseType<ApiResponse<AppointmentDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reschedule(Guid id, RescheduleAppointmentRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _appointments.RescheduleAsync(id, request, cancellationToken));

    [HttpPost("{id:guid}/assign-staff")]
    [Authorize(Policy = Permissions.AppointmentManage)]
    [ProducesResponseType<ApiResponse<AppointmentDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AssignStaff(Guid id, AssignAppointmentStaffRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _appointments.AssignStaffAsync(id, request, cancellationToken));

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = Permissions.AppointmentManage)]
    [ProducesResponseType<ApiResponse<AppointmentDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cancel(Guid id, CancelAppointmentRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _appointments.CancelAsync(id, request, cancellationToken));

    /// <summary>BR-BKG-08: only a confirmed appointment whose start time has passed.</summary>
    [HttpPost("{id:guid}/no-show")]
    [Authorize(Policy = Permissions.AppointmentManage)]
    [ProducesResponseType<ApiResponse<AppointmentDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> MarkNoShow(Guid id, MarkNoShowRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _appointments.MarkNoShowAsync(id, request, cancellationToken));
}
