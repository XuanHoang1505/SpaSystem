using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Common.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Interfaces.Services.Staff;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>The owner manages and reviews a staff member's certifications (docs/specs/staff.md, UC-SPA-22 bổ sung).</summary>
[Route("api/v1/staff/{staffMemberId:guid}/certifications")]
[Authorize(Policy = Permissions.StaffManage)]
public sealed class StaffCertificationsController : ApiController
{
    private readonly IStaffCertificationService _certifications;

    public StaffCertificationsController(IStaffCertificationService certifications) => _certifications = certifications;

    [HttpGet]
    [ProducesResponseType<ApiResponse<IReadOnlyList<StaffCertificationDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List(Guid staffMemberId, CancellationToken cancellationToken) =>
        HandleResult(await _certifications.ListAsync(staffMemberId, cancellationToken));

    [HttpPost]
    [ProducesResponseType<ApiResponse<StaffCertificationDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(Guid staffMemberId, SaveStaffCertificationRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _certifications.CreateAsync(staffMemberId, request, cancellationToken), StatusCodes.Status201Created);

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ApiResponse<StaffCertificationDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        Guid staffMemberId, Guid id, SaveStaffCertificationRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _certifications.UpdateAsync(staffMemberId, id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid staffMemberId, Guid id, CancellationToken cancellationToken)
    {
        await _certifications.DeleteAsync(staffMemberId, id, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/verify")]
    [ProducesResponseType<ApiResponse<StaffCertificationDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Verify(Guid staffMemberId, Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _certifications.VerifyAsync(staffMemberId, id, cancellationToken));

    [HttpPost("{id:guid}/reject")]
    [ProducesResponseType<ApiResponse<StaffCertificationDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reject(
        Guid staffMemberId, Guid id, RejectStaffCertificationRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _certifications.RejectAsync(staffMemberId, id, request, cancellationToken));

    [HttpPost("{id:guid}/image")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ImageUploadOptions.HardLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = ImageUploadOptions.HardLimitBytes)]
    [ProducesResponseType<ApiResponse<StaffCertificationDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> UploadImage(Guid staffMemberId, Guid id, IFormFile? file, CancellationToken cancellationToken)
    {
        await using var content = file?.OpenReadStream();
        return HandleResult(await _certifications.UploadImageAsync(staffMemberId, id, new ImageUploadRequest(content, file?.Length ?? 0), cancellationToken));
    }

    [HttpDelete("{id:guid}/image")]
    [ProducesResponseType<ApiResponse<StaffCertificationDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> DeleteImage(Guid staffMemberId, Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _certifications.DeleteImageAsync(staffMemberId, id, cancellationToken));
}
