namespace NhuNguyetSpa.API.Authentication;

/// <summary>The web refresh-token cookie (docs/specs/auth.md, BR-AUTH-20). Not secret, so it lives in appsettings.</summary>
public sealed class AuthCookieOptions
{
    public const string SectionName = "AuthCookie";

    public string Name { get; set; } = "spa_refresh_token";

    /// <summary>
    /// Browsers accept a Secure cookie over plain HTTP only on localhost, so Development turns it off for LAN testing (Q-70).
    /// </summary>
    public bool Secure { get; set; } = true;
}
