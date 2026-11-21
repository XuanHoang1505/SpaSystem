using Microsoft.Extensions.Options;
using FluentValidation;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
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
    private readonly IOptions<JwtOptions> _jwtOptions;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly IValidator<RefreshTokenRequest> _refreshValidator;

    public AuthService(
        IUserRepository users,
        IRefreshTokenRepository refreshTokens,
        IPasswordHasher passwordHasher,
        ITokenService tokens,
        IUnitOfWork unitOfWork,
        IDateTimeProvider clock,
        IOptions<JwtOptions> jwtOptions,
        IValidator<LoginRequest> loginValidator,
        IValidator<RefreshTokenRequest> refreshValidator)
    {
        _users = users;
        _refreshTokens = refreshTokens;
        _passwordHasher = passwordHasher;
        _tokens = tokens;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _jwtOptions = jwtOptions;
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
        if (!user.HasPassword)
        {
            // Q-84: an account made by Google sign-in has no password until one is set through password reset.
            _passwordHasher.Verify(_passwordHasher.DummyHash, request.Password);
            throw AuthErrors.InvalidCredentials();
        }
        if (!_passwordHasher.Verify(user.PasswordHash, request.Password))
            throw AuthErrors.InvalidCredentials();
        var now = _clock.UtcNow;
        await AuthSessions.EnsureCanSignInAsync(_users, user, now, cancellationToken);

        var result = await AuthSessions.IssueAsync(_tokens, _refreshTokens, user, now, cancellationToken);
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
            // BR-AUTH-22: shortly after its rotation this is a concurrent refresh (two tabs, one cookie), not a theft.
            if (now - stored.RevokedAtUtc.Value <= TimeSpan.FromSeconds(_jwtOptions.Value.RefreshReuseGraceSeconds))
                throw AuthErrors.InvalidRefreshToken();
            // BR-AUTH-04: only rotation marks a token, so a rotated token coming back means it leaked; end every session.
            await _refreshTokens.DeleteAllActiveAsync(stored.UserId, now, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            throw AuthErrors.InvalidRefreshToken();
        }
        if (stored.ExpiresAtUtc <= now)
            throw AuthErrors.InvalidRefreshToken();
        if (stored.User.Status != UserStatus.Active)
        {
            await _refreshTokens.DeleteAsync(stored.Id, cancellationToken);
            throw AuthErrors.NotActive(stored.User.Status);
        }
        if (await AuthSessions.HasResignedAsync(_users, stored.User, now, cancellationToken))
        {
            await _refreshTokens.DeleteAsync(stored.Id, cancellationToken);
            throw AuthErrors.NotActive(UserStatus.Inactive);
        }

        AuthResultDto? result = null;
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            if (!await _refreshTokens.TryRevokeAsync(stored.Id, now, token))
                throw AuthErrors.InvalidRefreshToken();
            result = await AuthSessions.IssueAsync(_tokens, _refreshTokens, stored.User, now, token);
            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);
        return OperationResult<AuthResultDto>.Success(result!);
    }

    public async Task LogoutAsync(RefreshTokenRequest request, Guid? currentUserId, CancellationToken cancellationToken)
    {
        await _refreshValidator.ValidateAndThrowAsync(request, cancellationToken);
        var stored = await _refreshTokens.FindByHashAsync(_tokens.HashRefreshToken(request.RefreshToken), cancellationToken);
        // Without a caller (cookie mode, Q-69) holding the HttpOnly cookie is the proof of ownership.
        if (stored is { RevokedAtUtc: null } && (currentUserId is null || stored.UserId == currentUserId))
            await _refreshTokens.DeleteAsync(stored.Id, cancellationToken);
    }
}
