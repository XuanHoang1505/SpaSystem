namespace NhuNguyetSpa.Application.Interfaces.Authentication;

/// <summary>
/// Port for checking a Google ID token (signature from Google's keys, issuer, audience = our client ID, lifetime).
/// Returns null for any token that fails the checks. Throws <c>ServiceUnavailableException</c> (google_sign_in_unavailable)
/// when the client ID is not configured or Google's keys cannot be fetched.
/// </summary>
public interface IGoogleTokenValidator
{
    Task<GoogleIdentity?> ValidateAsync(string idToken, CancellationToken cancellationToken);
}
