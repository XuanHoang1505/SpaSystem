using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.DTOs.Auth;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Auth;

/// <summary>What every way of signing in shares (password and Google): who may sign in, and the tokens it gets.</summary>
internal static class AuthSessions
{
    /// <summary>Adds the refresh token to the unit of work (the caller saves) and returns the session.</summary>
    public static async Task<AuthResultDto> IssueAsync(ITokenService tokens, IRefreshTokenRepository refreshTokens, User user, DateTime now,
        CancellationToken cancellationToken)
    {
        var access = tokens.CreateAccessToken(user, now);
        var refresh = tokens.CreateRefreshToken(now);
        await refreshTokens.AddAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refresh.TokenHash,
            ExpiresAtUtc = refresh.ExpiresAtUtc,
            CreatedAtUtc = now,
        }, cancellationToken);
        return new AuthResultDto(access.Token, access.ExpiresAtUtc, refresh.Token, refresh.ExpiresAtUtc,
            new AuthUserDto(user.Id, user.FullName, user.Email, user.Role));
    }

    /// <summary>Throws account_locked / account_inactive unless the user may sign in at <paramref name="nowUtc"/>.</summary>
    public static async Task EnsureCanSignInAsync(IUserRepository users, User user, DateTime nowUtc, CancellationToken cancellationToken)
    {
        if (user.Status != UserStatus.Active)
            throw AuthErrors.NotActive(user.Status);
        if (await HasResignedAsync(users, user, nowUtc, cancellationToken))
            throw AuthErrors.NotActive(UserStatus.Inactive);
    }

    /// <summary>
    /// BR-STF-05: a resignation recorded for a future date leaves the account active (no background job), so staff are
    /// refused from that date (Vietnam calendar) even while <c>users.status</c> is still active.
    /// </summary>
    public static async Task<bool> HasResignedAsync(IUserRepository users, User user, DateTime nowUtc, CancellationToken cancellationToken) =>
        user.Role == UserRole.Staff && await users.IsResignedStaffAsync(user.Id, SpaTime.Today(nowUtc), cancellationToken);
}
