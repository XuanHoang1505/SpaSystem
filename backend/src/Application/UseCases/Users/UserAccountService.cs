using FluentValidation;
using FluentValidation.Results;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Users;
using NhuNguyetSpa.Application.Validators.Users;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Users;

/// <summary>
/// UC-SPA-05: the owner finds, views and edits accounts of every role, and locks or unlocks them (BR-AUTH-18). Email, role
/// and password never change here (BR-AUTH-14); staff-only fields stay in <c>/staff/{id}</c>.
/// </summary>
public sealed class UserAccountService : IUserAccountService
{
    private readonly ICurrentUserService _currentUser;
    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly UserProfileEditor _profileEditor;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly IValidator<UserFilter> _filterValidator;
    private readonly IValidator<ChangeUserStatusRequest> _statusValidator;

    public UserAccountService(
        ICurrentUserService currentUser,
        IUserRepository users,
        IRefreshTokenRepository refreshTokens,
        UserProfileEditor profileEditor,
        IUnitOfWork unitOfWork,
        IDateTimeProvider clock,
        IValidator<UserFilter> filterValidator,
        IValidator<ChangeUserStatusRequest> statusValidator)
    {
        _currentUser = currentUser;
        _users = users;
        _refreshTokens = refreshTokens;
        _profileEditor = profileEditor;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _filterValidator = filterValidator;
        _statusValidator = statusValidator;
    }

    public async Task<OperationResult<PagedResult<UserListItemDto>>> SearchAsync(PagedQuery query, UserFilter filter, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(filter);
        var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim();
        if (search?.Length > UserQuery.MaxSearchLength)
            throw new ValidationException([
                new ValidationFailure("search", $"Từ khóa tối đa {UserQuery.MaxSearchLength} ký tự.") { ErrorCode = "validation_error" }]);
        await _filterValidator.ValidateAndThrowAsync(filter, cancellationToken);
        UserQuery.TryParse<UserRole>(filter.Role, out var role);
        UserQuery.TryParse<UserStatus>(filter.Status, out var status);

        var criteria = new UserSearchCriteria(search, role, status, query.PageNumber, query.PageSize);
        return OperationResult<PagedResult<UserListItemDto>>.Success(await _users.SearchAsync(criteria, cancellationToken));
    }

    public async Task<OperationResult<UserDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken) =>
        OperationResult<UserDetailDto>.Success(await _users.GetDetailAsync(id, cancellationToken) ?? throw UserErrors.UserNotFound());

    public async Task<OperationResult<UserDetailDto>> UpdateAsync(Guid id, UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        request = await _profileEditor.NormalizeAndValidateAsync(request, cancellationToken);
        var user = await _users.GetByIdAsync(id, cancellationToken) ?? throw UserErrors.UserNotFound();
        await _profileEditor.ApplyAsync(user, request, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        var detail = await GetAsync(id, cancellationToken);
        return OperationResult<UserDetailDto>.Success(detail.Data!, "Đã cập nhật tài khoản.");
    }

    public async Task ChangeStatusAsync(Guid id, ChangeUserStatusRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _statusValidator.ValidateAndThrowAsync(request, cancellationToken);
        var lockRequested = request.Status == UserStatus.Locked;
        if (lockRequested && id == _currentUser.UserId)
            throw UserErrors.CannotLockSelf();

        var user = await _users.GetByIdAsync(id, cancellationToken) ?? throw UserErrors.UserNotFound();
        var changed = lockRequested ? user.Lock() : user.Unlock();
        if (!changed)
            return;
        // A locked account loses every session; its access token expires on its own (Q-52).
        if (lockRequested)
            await _refreshTokens.RevokeAllActiveAsync(user.Id, _clock.UtcNow, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
