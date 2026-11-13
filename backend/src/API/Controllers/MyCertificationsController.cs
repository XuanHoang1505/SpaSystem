using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Common.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Interfaces.Services.Staff;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>
/// A staff member declares their own certifications; every write waits for the owner's review (BR-STF-14).
/// The staff member is always the caller of the access token.
/// </summary>
[Route("api/v1/me/certifications")]
[Authorize(Policy = Permissions.CertificationSelf)]
public sealed class MyCertificationsController : ApiController
{
    private readonly IStaffCertificationService _certifications;

    public MyCertificationsController(IStaffCertificationService certifications) => _certifications = certifications;

    [HttpGet]
    [ProducesResponseType<ApiResponse<IReadOnlyList<StaffCertificationDto>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken) =>
        HandleResult(await _certifications.ListMineAsync(cancellationToken));

    [HttpPost]
    [ProducesResponseType<ApiResponse<StaffCertificationDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(SaveStaffCertificationRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _certifications.CreateMineAsync(request, cancellationToken), StatusCodes.Status201Created);

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ApiResponse<StaffCertificationDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, SaveStaffCertificationRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _certifications.UpdateMineAsync(id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _certifications.DeleteMineAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/image")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ImageUploadOptions.HardLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = ImageUploadOptions.HardLimitBytes)]
    [ProducesResponseType<ApiResponse<StaffCertificationDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> UploadImage(Guid id, IFormFile? file, CancellationToken cancellationToken)
    {
        await using var content = file?.OpenReadStream();
        return HandleResult(await _certifications.UploadMyImageAsync(id, new ImageUploadRequest(content, file?.Length ?? 0), cancellationToken));
    }

    [HttpDelete("{id:guid}/image")]
    [ProducesResponseType<ApiResponse<StaffCertificationDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> DeleteImage(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _certifications.DeleteMyImageAsync(id, cancellationToken));
}
