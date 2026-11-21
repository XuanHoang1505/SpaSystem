using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Authentication;

public interface ITokenService
{
    AccessToken CreateAccessToken(User user, DateTime nowUtc);

    IssuedRefreshToken CreateRefreshToken(DateTime nowUtc);

    string HashRefreshToken(string token);

    /// <summary>Short-lived JWT for <c>/auth/forgot-password/reset</c>; its audience differs from access tokens.</summary>
    AccessToken CreatePasswordResetToken(User user, DateTime nowUtc, DateTime expiresAtUtc);

    /// <summary>Returns null unless the token is a reset token signed with our key and still valid at <paramref name="nowUtc"/>.</summary>
    Task<PasswordResetClaims?> ReadPasswordResetTokenAsync(string token, DateTime nowUtc);

    /// <summary>Fingerprint of a password hash; changes whenever the password changes, so a used reset token stops matching.</summary>
    string ComputePasswordStamp(string passwordHash);

    /// <summary>Short-lived JWT carrying a verified Google identity until the first sign-up is completed (Q-84).</summary>
    AccessToken CreateGoogleSignupToken(GoogleIdentity identity, DateTime nowUtc, DateTime expiresAtUtc);

    /// <summary>Returns null unless the token is a Google sign-up token signed with our key and still valid at <paramref name="nowUtc"/>.</summary>
    Task<GoogleIdentity?> ReadGoogleSignupTokenAsync(string token, DateTime nowUtc);
}
