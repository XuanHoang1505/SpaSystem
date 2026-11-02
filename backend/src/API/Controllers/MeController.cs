using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Extensions;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Application.Interfaces.Services.Users;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>The signed-in user's own account: UC-SPA-04 (docs/specs/auth.md). Always the user of the access token.</summary>
[Route("api/v1/me")]
[Authorize(Policy = Permissions.AccountSelf)]
public sealed class MeController : ApiController
{
    private readonly IProfileService _profile;

    public MeController(IProfileService profile) => _profile = profile;

    [HttpGet]
    [ProducesResponseType<ApiResponse<MeDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        HandleResult(await _profile.GetAsync(cancellationToken));

    [HttpPut]
    [ProducesResponseType<ApiResponse<MeDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(UpdateProfileRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _profile.UpdateAsync(request, cancellationToken));

    /// <summary>Ends every session of the user (BR-AUTH-16); shares the <c>auth</c> rate limit (BR-AUTH-17).</summary>
    [HttpPut("password")]
    [EnableRateLimiting(AuthenticationExtensions.AuthRateLimitPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        await _profile.ChangePasswordAsync(request, cancellationToken);
        return NoContent();
    }

    [HttpPost("avatar")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ImageUploadOptions.HardLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = ImageUploadOptions.HardLimitBytes)]
    [ProducesResponseType<ApiResponse<AvatarUrlDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> UploadAvatar(IFormFile? file, CancellationToken cancellationToken)
    {
        await using var content = file?.OpenReadStream();
        return HandleResult(await _profile.UploadAvatarAsync(new ImageUploadRequest(content, file?.Length ?? 0), cancellationToken));
    }

    [HttpDelete("avatar")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> DeleteAvatar(CancellationToken cancellationToken)
    {
        await _profile.DeleteAvatarAsync(cancellationToken);
        return NoContent();
    }
}
