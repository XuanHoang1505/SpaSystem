using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Storage;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Users;
using NhuNguyetSpa.Application.Interfaces.Storage;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.UseCases.Users;

/// <summary>
/// UC-SPA-04: the signed-in user reads and edits their own account. Every call works on the user of the access token, never
/// on an id from the client (BR-AUTH-14).
/// </summary>
public sealed class ProfileService : IProfileService
{
    private readonly ICurrentUserService _currentUser;
    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IFileStorage _storage;
    private readonly ImageUploadReader _imageReader;
    private readonly UserProfileEditor _profileEditor;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly IValidator<ChangePasswordRequest> _passwordValidator;
    private readonly IOptions<AccountOptions> _options;

    public ProfileService(
        ICurrentUserService currentUser,
        IUserRepository users,
        IRefreshTokenRepository refreshTokens,
        IPasswordHasher passwordHasher,
        IFileStorage storage,
        ImageUploadReader imageReader,
        UserProfileEditor profileEditor,
        IUnitOfWork unitOfWork,
        IDateTimeProvider clock,
        IValidator<ChangePasswordRequest> passwordValidator,
        IOptions<AccountOptions> options)
    {
        _currentUser = currentUser;
        _users = users;
        _refreshTokens = refreshTokens;
        _passwordHasher = passwordHasher;
        _storage = storage;
        _imageReader = imageReader;
        _profileEditor = profileEditor;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _passwordValidator = passwordValidator;
        _options = options;
    }

    public async Task<OperationResult<MeDto>> GetAsync(CancellationToken cancellationToken) =>
        OperationResult<MeDto>.Success(ToDto(await CurrentUserAsync(cancellationToken)));

    public async Task<OperationResult<MeDto>> UpdateAsync(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        request = await _profileEditor.NormalizeAndValidateAsync(request, cancellationToken);
        var user = await CurrentUserAsync(cancellationToken);
        await _profileEditor.ApplyAsync(user, request, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<MeDto>.Success(ToDto(user), "Đã cập nhật thông tin tài khoản.");
    }

    public async Task ChangePasswordAsync(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _passwordValidator.ValidateAndThrowAsync(request, cancellationToken);
        var user = await CurrentUserAsync(cancellationToken);
        if (!_passwordHasher.Verify(user.PasswordHash, request.CurrentPassword))
            throw UserErrors.CurrentPasswordIncorrect();

        user.ChangePasswordHash(_passwordHasher.Hash(request.NewPassword));
        // Every session ends, the current one included: the client signs in again (BR-AUTH-16, Q-51).
        if (_options.Value.RevokeSessionsOnPasswordChange)
            await _refreshTokens.RevokeAllActiveAsync(user.Id, _clock.UtcNow, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<OperationResult<AvatarUrlDto>> UploadAvatarAsync(ImageUploadRequest file, CancellationToken cancellationToken)
    {
        await using var image = await _imageReader.ReadAsync(file, cancellationToken);
        var user = await CurrentUserAsync(cancellationToken);
        // The stored URL changes only after the upload succeeds, so a storage failure keeps the current avatar (BR-AUTH-19).
        var url = await _storage.UploadImageAsync(image.Content, AvatarPublicId(user.Id), image.ContentType, cancellationToken);
        user.SetAvatar(url);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<AvatarUrlDto>.Success(new AvatarUrlDto(url), "Đã cập nhật ảnh đại diện.");
    }

    public async Task DeleteAvatarAsync(CancellationToken cancellationToken)
    {
        var user = await CurrentUserAsync(cancellationToken);
        if (user.AvatarUrl is null)
            return;
        await _storage.DeleteAsync(AvatarPublicId(user.Id), cancellationToken);
        user.RemoveAvatar();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static string AvatarPublicId(Guid userId) => $"avatars/{userId}";

    private async Task<User> CurrentUserAsync(CancellationToken cancellationToken) =>
        _currentUser.UserId is { } id && await _users.GetByIdAsync(id, cancellationToken) is { } user
            ? user
            : throw UserErrors.UserNotFound();

    private static MeDto ToDto(User user) => new(
        user.Id, user.FullName, user.Email, user.PhoneNumber, user.Role, user.Status, user.AvatarUrl, user.DateOfBirth, user.Gender,
        user.CreatedAtUtc);
}
