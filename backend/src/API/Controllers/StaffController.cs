using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Interfaces.Services.Staff;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>Staff members: UC-SPA-22 (owner), plus the public list used for booking (docs/specs/staff.md).</summary>
[Route("api/v1/staff")]
public sealed class StaffController : ApiController
{
    private readonly IStaffService _staff;

    public StaffController(IStaffService staff) => _staff = staff;

    /// <summary>The owner gets the full list; everyone else (an invalid or expired Bearer included) gets the public view.</summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<ApiResponse<PagedResult<StaffListItemDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search([FromQuery] PagedQuery query, [FromQuery] StaffFilter filter, CancellationToken cancellationToken) =>
        User.IsInRole(Roles.Owner)
            ? HandleResult(await _staff.SearchAsync(query, filter, cancellationToken))
            : HandleResult(await _staff.SearchPublicAsync(query, filter, cancellationToken));

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.StaffManage)]
    [ProducesResponseType<ApiResponse<StaffDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _staff.GetAsync(id, cancellationToken));

    /// <summary>Creates the account and mails a temporary password to the staff member; the response never contains it.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.StaffManage)]
    [ProducesResponseType<ApiResponse<StaffDetailDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Create(CreateStaffRequest request, CancellationToken cancellationToken)
    {
        var result = await _staff.CreateAsync(request, cancellationToken);
        Response.Headers.Location = Url.Action(nameof(Get), new { id = result.Data!.Id });
        return HandleResult(result, StatusCodes.Status201Created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.StaffManage)]
    [ProducesResponseType<ApiResponse<StaffDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, UpdateStaffRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _staff.UpdateAsync(id, request, cancellationToken));

    [HttpPut("{id:guid}/services")]
    [Authorize(Policy = Permissions.StaffManage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateServices(Guid id, UpdateStaffServicesRequest request, CancellationToken cancellationToken)
    {
        await _staff.UpdateServicesAsync(id, request, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/resign")]
    [Authorize(Policy = Permissions.StaffManage)]
    [ProducesResponseType<ApiResponse<ResignationResultDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Resign(Guid id, ResignStaffRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _staff.ResignAsync(id, request, cancellationToken));
}
