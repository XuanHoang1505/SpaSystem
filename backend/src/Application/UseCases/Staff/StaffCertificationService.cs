using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Storage;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Staff;
using NhuNguyetSpa.Application.Interfaces.Storage;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Staff;

/// <summary>
/// UC-SPA-22 bổ sung (BR-STF-12, 13, 14). The owner's writes are verified at once; a staff member's writes wait for review.
/// A certification of another staff member reads as <c>404 staff_certification_not_found</c>. The photo of the certificate
/// is stored like catalog images (public URL for now, Q-74); a staff member changing it sends the certification back to
/// review, the owner changing it keeps the review status.
/// </summary>
public sealed class StaffCertificationService : IStaffCertificationService
{
    private readonly IStaffCertificationRepository _certifications;
    private readonly IStaffMemberRepository _staff;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<StaffCertificationOptions> _options;
    private readonly IValidator<SaveStaffCertificationRequest> _saveValidator;
    private readonly IValidator<RejectStaffCertificationRequest> _rejectValidator;
    private readonly IFileStorage _storage;
    private readonly ImageUploadReader _imageReader;

    public StaffCertificationService(
        IStaffCertificationRepository certifications,
        IStaffMemberRepository staff,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<StaffCertificationOptions> options,
        IValidator<SaveStaffCertificationRequest> saveValidator,
        IValidator<RejectStaffCertificationRequest> rejectValidator,
        IFileStorage storage,
        ImageUploadReader imageReader)
    {
        _certifications = certifications;
        _staff = staff;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _options = options;
        _saveValidator = saveValidator;
        _rejectValidator = rejectValidator;
        _storage = storage;
        _imageReader = imageReader;
    }

    private Guid CallerId => _currentUser.UserId ?? throw new InvalidOperationException("The caller has no user id.");

    // Owner side ---------------------------------------------------------------------------------------------------------

    public async Task<OperationResult<IReadOnlyList<StaffCertificationDto>>> ListAsync(Guid staffMemberId, CancellationToken cancellationToken)
    {
        await EnsureStaffAsync(staffMemberId, cancellationToken);
        return OperationResult<IReadOnlyList<StaffCertificationDto>>.Success(await ListForAsync(staffMemberId, cancellationToken));
    }

    public async Task<OperationResult<StaffCertificationDto>> CreateAsync(
        Guid staffMemberId, SaveStaffCertificationRequest request, CancellationToken cancellationToken)
    {
        await EnsureStaffAsync(staffMemberId, cancellationToken);
        return await AddAsync(staffMemberId, request, ownerWrite: true, cancellationToken);
    }

    public async Task<OperationResult<StaffCertificationDto>> UpdateAsync(
        Guid staffMemberId, Guid id, SaveStaffCertificationRequest request, CancellationToken cancellationToken) =>
        await ChangeAsync(staffMemberId, id, request, ownerWrite: true, cancellationToken);

    public async Task DeleteAsync(Guid staffMemberId, Guid id, CancellationToken cancellationToken)
    {
        var certification = await LoadAsync(staffMemberId, id, cancellationToken);
        await RemoveAsync(certification, cancellationToken);
    }

    public Task<OperationResult<StaffCertificationDto>> UploadImageAsync(
        Guid staffMemberId, Guid id, ImageUploadRequest file, CancellationToken cancellationToken) =>
        SetImageAsync(staffMemberId, id, file, ownerWrite: true, cancellationToken);

    public Task<OperationResult<StaffCertificationDto>> DeleteImageAsync(Guid staffMemberId, Guid id, CancellationToken cancellationToken) =>
        RemoveImageAsync(staffMemberId, id, ownerWrite: true, cancellationToken);

    public async Task<OperationResult<StaffCertificationDto>> VerifyAsync(Guid staffMemberId, Guid id, CancellationToken cancellationToken)
    {
        var certification = await LoadAsync(staffMemberId, id, cancellationToken);
        if (certification.VerificationStatus == CertificationVerificationStatus.Verified)
            throw StaffCertificationErrors.StatusInvalid("đã duyệt");
        certification.Verify(CallerId, _clock.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<StaffCertificationDto>.Success(ToDto(certification));
    }

    public async Task<OperationResult<StaffCertificationDto>> RejectAsync(
        Guid staffMemberId, Guid id, RejectStaffCertificationRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _rejectValidator.ValidateAndThrowAsync(request, cancellationToken);
        var certification = await LoadAsync(staffMemberId, id, cancellationToken);
        if (certification.VerificationStatus == CertificationVerificationStatus.Rejected)
            throw StaffCertificationErrors.StatusInvalid("bị từ chối");
        certification.Reject(request.Reason!.Trim(), CallerId, _clock.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<StaffCertificationDto>.Success(ToDto(certification));
    }

    // Staff side (always the caller) --------------------------------------------------------------------------------------

    public async Task<OperationResult<IReadOnlyList<StaffCertificationDto>>> ListMineAsync(CancellationToken cancellationToken) =>
        OperationResult<IReadOnlyList<StaffCertificationDto>>.Success(await ListForAsync(CallerId, cancellationToken));

    public Task<OperationResult<StaffCertificationDto>> CreateMineAsync(SaveStaffCertificationRequest request, CancellationToken cancellationToken) =>
        AddAsync(CallerId, request, ownerWrite: false, cancellationToken);

    public Task<OperationResult<StaffCertificationDto>> UpdateMineAsync(
        Guid id, SaveStaffCertificationRequest request, CancellationToken cancellationToken) =>
        ChangeAsync(CallerId, id, request, ownerWrite: false, cancellationToken);

    public async Task DeleteMineAsync(Guid id, CancellationToken cancellationToken)
    {
        var certification = await LoadAsync(CallerId, id, cancellationToken);
        if (certification.VerificationStatus == CertificationVerificationStatus.Verified)
            throw StaffCertificationErrors.Verified();
        await RemoveAsync(certification, cancellationToken);
    }

    public Task<OperationResult<StaffCertificationDto>> UploadMyImageAsync(Guid id, ImageUploadRequest file, CancellationToken cancellationToken) =>
        SetImageAsync(CallerId, id, file, ownerWrite: false, cancellationToken);

    public Task<OperationResult<StaffCertificationDto>> DeleteMyImageAsync(Guid id, CancellationToken cancellationToken) =>
        RemoveImageAsync(CallerId, id, ownerWrite: false, cancellationToken);

    // Shared -------------------------------------------------------------------------------------------------------------

    private async Task<OperationResult<StaffCertificationDto>> AddAsync(
        Guid staffMemberId, SaveStaffCertificationRequest request, bool ownerWrite, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _saveValidator.ValidateAndThrowAsync(request, cancellationToken);
        var max = _options.Value.MaxPerStaff;
        if (await _certifications.CountForStaffAsync(staffMemberId, cancellationToken) >= max)
            throw StaffCertificationErrors.Limit(max);

        var certification = new StaffCertification { StaffMemberId = staffMemberId };
        Apply(certification, request, ownerWrite);
        await _certifications.AddAsync(certification, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<StaffCertificationDto>.Success(ToDto(certification));
    }

    private async Task<OperationResult<StaffCertificationDto>> ChangeAsync(
        Guid staffMemberId, Guid id, SaveStaffCertificationRequest request, bool ownerWrite, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _saveValidator.ValidateAndThrowAsync(request, cancellationToken);
        var certification = await LoadAsync(staffMemberId, id, cancellationToken);
        Apply(certification, request, ownerWrite);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<StaffCertificationDto>.Success(ToDto(certification));
    }

    private async Task<OperationResult<StaffCertificationDto>> SetImageAsync(
        Guid staffMemberId, Guid id, ImageUploadRequest file, bool ownerWrite, CancellationToken cancellationToken)
    {
        var certification = await LoadAsync(staffMemberId, id, cancellationToken);
        await using var image = await _imageReader.ReadAsync(file, cancellationToken);
        var url = await _storage.UploadImageAsync(image.Content, ImagePublicId(certification.Id), image.ContentType, cancellationToken);
        certification.SetImage(url);
        if (!ownerWrite) certification.SubmitForReview();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<StaffCertificationDto>.Success(ToDto(certification), "Đã cập nhật ảnh bằng.");
    }

    private async Task<OperationResult<StaffCertificationDto>> RemoveImageAsync(
        Guid staffMemberId, Guid id, bool ownerWrite, CancellationToken cancellationToken)
    {
        var certification = await LoadAsync(staffMemberId, id, cancellationToken);
        if (certification.ImageUrl is null)
            return OperationResult<StaffCertificationDto>.Success(ToDto(certification));
        await _storage.DeleteAsync(ImagePublicId(certification.Id), cancellationToken);
        certification.RemoveImage();
        if (!ownerWrite) certification.SubmitForReview();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<StaffCertificationDto>.Success(ToDto(certification), "Đã xóa ảnh bằng.");
    }

    /// <summary>The image goes first: if storage fails (503) the certification stays, so nothing is left pointing nowhere.</summary>
    private async Task RemoveAsync(StaffCertification certification, CancellationToken cancellationToken)
    {
        if (certification.ImageUrl is not null)
            await _storage.DeleteAsync(ImagePublicId(certification.Id), cancellationToken);
        _certifications.Remove(certification);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static string ImagePublicId(Guid certificationId) => $"staff-certifications/{certificationId}";

    private void Apply(StaffCertification certification, SaveStaffCertificationRequest request, bool ownerWrite)
    {
        certification.Describe(
            request.Name!.Trim(), Clean(request.Issuer), Clean(request.CredentialNumber), request.IssuedOn, request.ExpiresOn,
            request.IsPublic ?? true, Clean(request.Note));
        if (ownerWrite) certification.Verify(CallerId, _clock.UtcNow);
        else certification.SubmitForReview();
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private async Task EnsureStaffAsync(Guid staffMemberId, CancellationToken cancellationToken)
    {
        if (await _staff.GetByIdAsync(staffMemberId, cancellationToken) is null)
            throw StaffErrors.StaffNotFound();
    }

    private async Task<StaffCertification> LoadAsync(Guid staffMemberId, Guid id, CancellationToken cancellationToken) =>
        await _certifications.GetForStaffAsync(id, staffMemberId, cancellationToken) ?? throw StaffCertificationErrors.NotFound();

    private async Task<IReadOnlyList<StaffCertificationDto>> ListForAsync(Guid staffMemberId, CancellationToken cancellationToken)
    {
        var rows = await _certifications.ListForStaffAsync(staffMemberId, cancellationToken);
        // Most urgent first: expiring soon, then valid, then expired; then by name.
        return rows.Select(ToDto)
            .OrderBy(dto => dto.Status switch
            {
                StaffCertificationStatus.ExpiringSoon => 0,
                StaffCertificationStatus.Valid => 1,
                _ => 2,
            })
            .ThenBy(dto => dto.Name, StringComparer.CurrentCulture)
            .ToList();
    }

    private StaffCertificationDto ToDto(StaffCertification certification) => new(
        certification.Id, certification.Name, certification.Issuer, certification.CredentialNumber, certification.IssuedOn,
        certification.ExpiresOn, certification.IsPublic, certification.Note, certification.ImageUrl,
        StaffCertificationValidity.Of(certification.ExpiresOn, SpaTime.Today(_clock.UtcNow), _options.Value.ExpiringSoonDays),
        certification.VerificationStatus, certification.RejectionReason, certification.ReviewedAtUtc, certification.CreatedAtUtc,
        certification.UpdatedAtUtc);
}
