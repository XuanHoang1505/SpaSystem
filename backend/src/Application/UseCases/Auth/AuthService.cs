using FluentValidation;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Auth;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Auth;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Auth;

public sealed class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokens;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly IValidator<RefreshTokenRequest> _refreshValidator;

    public AuthService(
        IUserRepository users,
        IRefreshTokenRepository refreshTokens,
        IPasswordHasher passwordHasher,
        ITokenService tokens,
        IUnitOfWork unitOfWork,
        IDateTimeProvider clock,
        IValidator<LoginRequest> loginValidator,
        IValidator<RefreshTokenRequest> refreshValidator)
    {
        _users = users;
        _refreshTokens = refreshTokens;
        _passwordHasher = passwordHasher;
        _tokens = tokens;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _loginValidator = loginValidator;
        _refreshValidator = refreshValidator;
    }

    public async Task<OperationResult<AuthResultDto>> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        await _loginValidator.ValidateAndThrowAsync(request, cancellationToken);
        var user = await _users.FindByLoginAsync(request.Login.Trim(), cancellationToken);
        if (user is null)
        {
            _passwordHasher.Verify(_passwordHasher.DummyHash, request.Password);
            throw AuthErrors.InvalidCredentials();
        }
        if (!_passwordHasher.Verify(user.PasswordHash, request.Password))
            throw AuthErrors.InvalidCredentials();
        if (user.Status != UserStatus.Active)
            throw AuthErrors.NotActive(user.Status);
        var now = _clock.UtcNow;
        if (await HasResignedAsync(user, now, cancellationToken))
            throw AuthErrors.NotActive(UserStatus.Inactive);

        var result = await IssueTokensAsync(user, now, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<AuthResultDto>.Success(result);
    }

    public async Task<OperationResult<AuthResultDto>> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        await _refreshValidator.ValidateAndThrowAsync(request, cancellationToken);
        var now = _clock.UtcNow;
        var stored = await _refreshTokens.FindByHashAsync(_tokens.HashRefreshToken(request.RefreshToken), cancellationToken)
            ?? throw AuthErrors.InvalidRefreshToken();

        if (stored.RevokedAtUtc is not null)
        {
            // BR-AUTH-04: a revoked token coming back means it leaked; end every session of that user.
            await _refreshTokens.RevokeAllActiveAsync(stored.UserId, now, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            throw AuthErrors.InvalidRefreshToken();
        }
        if (stored.ExpiresAtUtc <= now)
            throw AuthErrors.InvalidRefreshToken();
        if (stored.User.Status != UserStatus.Active)
        {
            await _refreshTokens.TryRevokeAsync(stored.Id, now, cancellationToken);
            throw AuthErrors.NotActive(stored.User.Status);
        }
        if (await HasResignedAsync(stored.User, now, cancellationToken))
        {
            await _refreshTokens.TryRevokeAsync(stored.Id, now, cancellationToken);
            throw AuthErrors.NotActive(UserStatus.Inactive);
        }

        AuthResultDto? result = null;
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            if (!await _refreshTokens.TryRevokeAsync(stored.Id, now, token))
                throw AuthErrors.InvalidRefreshToken();
            result = await IssueTokensAsync(stored.User, now, token);
            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);
        return OperationResult<AuthResultDto>.Success(result!);
    }

    public async Task LogoutAsync(RefreshTokenRequest request, Guid currentUserId, CancellationToken cancellationToken)
    {
        await _refreshValidator.ValidateAndThrowAsync(request, cancellationToken);
        var stored = await _refreshTokens.FindByHashAsync(_tokens.HashRefreshToken(request.RefreshToken), cancellationToken);
        if (stored is { RevokedAtUtc: null } && stored.UserId == currentUserId)
            await _refreshTokens.TryRevokeAsync(stored.Id, _clock.UtcNow, cancellationToken);
    }

    private async Task<AuthResultDto> IssueTokensAsync(User user, DateTime now, CancellationToken cancellationToken)
    {
        var access = _tokens.CreateAccessToken(user, now);
        var refresh = _tokens.CreateRefreshToken(now);
        await _refreshTokens.AddAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refresh.TokenHash,
            ExpiresAtUtc = refresh.ExpiresAtUtc,
            CreatedAtUtc = now,
        }, cancellationToken);
        return new AuthResultDto(access.Token, access.ExpiresAtUtc, refresh.Token, refresh.ExpiresAtUtc,
            new AuthUserDto(user.Id, user.FullName, user.Email, user.Role));
    }

    /// <summary>
    /// BR-STF-05: a resignation recorded for a future date leaves the account active (no background job), so staff are
    /// refused from that date (Vietnam calendar) even while <c>users.status</c> is still active.
    /// </summary>
    private async Task<bool> HasResignedAsync(User user, DateTime nowUtc, CancellationToken cancellationToken) =>
        user.Role == UserRole.Staff && await _users.IsResignedStaffAsync(user.Id, SpaTime.Today(nowUtc), cancellationToken);
}
