using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Application.Interfaces.Services.Users;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>Account management by the owner: UC-SPA-05 (docs/specs/auth.md).</summary>
[Route("api/v1/users")]
[Authorize(Policy = Permissions.AccountManage)]
public sealed class UsersController : ApiController
{
    private readonly IUserAccountService _accounts;

    public UsersController(IUserAccountService accounts) => _accounts = accounts;

    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResult<UserListItemDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Search([FromQuery] PagedQuery query, [FromQuery] UserFilter filter, CancellationToken cancellationToken) =>
        HandleResult(await _accounts.SearchAsync(query, filter, cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<UserDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _accounts.GetAsync(id, cancellationToken));

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ApiResponse<UserDetailDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, UpdateProfileRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _accounts.UpdateAsync(id, request, cancellationToken));

    /// <summary>Locks (ending every session) or unlocks an account; the owner cannot lock themselves (BR-AUTH-18).</summary>
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeUserStatusRequest request, CancellationToken cancellationToken)
    {
        await _accounts.ChangeStatusAsync(id, request, cancellationToken);
        return NoContent();
    }
}
