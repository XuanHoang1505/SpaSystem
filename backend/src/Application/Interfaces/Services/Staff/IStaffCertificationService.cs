using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Staff;

namespace NhuNguyetSpa.Application.Interfaces.Services.Staff;

/// <summary>
/// Staff certifications (docs/specs/staff.md, UC-SPA-22 bổ sung): the owner manages and reviews them, a staff member
/// declares their own (always back to pending, BR-STF-14).
/// </summary>
public interface IStaffCertificationService
{
    Task<OperationResult<IReadOnlyList<StaffCertificationDto>>> ListAsync(Guid staffMemberId, CancellationToken cancellationToken);
    Task<OperationResult<StaffCertificationDto>> CreateAsync(Guid staffMemberId, SaveStaffCertificationRequest request, CancellationToken cancellationToken);
    Task<OperationResult<StaffCertificationDto>> UpdateAsync(Guid staffMemberId, Guid id, SaveStaffCertificationRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid staffMemberId, Guid id, CancellationToken cancellationToken);
    Task<OperationResult<StaffCertificationDto>> VerifyAsync(Guid staffMemberId, Guid id, CancellationToken cancellationToken);
    Task<OperationResult<StaffCertificationDto>> UploadImageAsync(Guid staffMemberId, Guid id, ImageUploadRequest file, CancellationToken cancellationToken);
    Task<OperationResult<StaffCertificationDto>> DeleteImageAsync(Guid staffMemberId, Guid id, CancellationToken cancellationToken);
    Task<OperationResult<StaffCertificationDto>> RejectAsync(Guid staffMemberId, Guid id, RejectStaffCertificationRequest request, CancellationToken cancellationToken);

    Task<OperationResult<IReadOnlyList<StaffCertificationDto>>> ListMineAsync(CancellationToken cancellationToken);
    Task<OperationResult<StaffCertificationDto>> CreateMineAsync(SaveStaffCertificationRequest request, CancellationToken cancellationToken);
    Task<OperationResult<StaffCertificationDto>> UpdateMineAsync(Guid id, SaveStaffCertificationRequest request, CancellationToken cancellationToken);
    Task DeleteMineAsync(Guid id, CancellationToken cancellationToken);
    Task<OperationResult<StaffCertificationDto>> UploadMyImageAsync(Guid id, ImageUploadRequest file, CancellationToken cancellationToken);
    Task<OperationResult<StaffCertificationDto>> DeleteMyImageAsync(Guid id, CancellationToken cancellationToken);
}
