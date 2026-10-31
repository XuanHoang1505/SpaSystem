using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.Interfaces.Services.Care;
using SecurityRoles = NhuNguyetSpa.Application.Common.Security.Roles;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>
/// Care of one visit: skin profile (UC-SPA-27) and completion (UC-SPA-28), docs/specs/care.md. Writes need <c>care.write</c>;
/// reads are open to the owner and staff, and the service checks the staff member is assigned (BR-SEC-01).
/// </summary>
[Route("api/v1")]
[Authorize]
public sealed class AppointmentCareController : ApiController
{
    private readonly ISkinProfileService _profiles;
    private readonly IAppointmentCompletionService _completion;

    public AppointmentCareController(ISkinProfileService profiles, IAppointmentCompletionService completion)
    {
        _profiles = profiles;
        _completion = completion;
    }

    [HttpGet("appointments/{id:guid}/skin-profile")]
    [Authorize(Roles = $"{SecurityRoles.Owner},{SecurityRoles.Staff}")]
    [ProducesResponseType<ApiResponse<SkinProfileDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSkinProfile(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _profiles.GetByAppointmentAsync(id, cancellationToken));

    [HttpPost("appointments/{id:guid}/skin-profile")]
    [Authorize(Policy = Permissions.CareWrite)]
    [ProducesResponseType<ApiResponse<SkinProfileDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateSkinProfile(Guid id, SaveSkinProfileRequest request, CancellationToken cancellationToken)
    {
        var result = await _profiles.CreateAsync(id, request, cancellationToken);
        Response.Headers.Location = Url.Action(nameof(GetSkinProfile), new { id });
        return HandleResult(result, StatusCodes.Status201Created);
    }

    [HttpPut("skin-profiles/{id:guid}")]
    [Authorize(Policy = Permissions.CareWrite)]
    [ProducesResponseType<ApiResponse<SkinProfileDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateSkinProfile(Guid id, SaveSkinProfileRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _profiles.UpdateAsync(id, request, cancellationToken));

    [HttpPost("appointments/{id:guid}/complete")]
    [Authorize(Policy = Permissions.CareWrite)]
    [ProducesResponseType<ApiResponse<CompleteAppointmentResult>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    // The result is optional, so a request without a body completes the visit with no result.
    public async Task<IActionResult> Complete(
        Guid id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CompleteAppointmentRequest? request, CancellationToken cancellationToken) =>
        HandleResult(await _completion.CompleteAsync(id, request ?? new CompleteAppointmentRequest(null), cancellationToken));
}
