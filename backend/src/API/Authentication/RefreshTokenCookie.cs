using Microsoft.Extensions.Options;

namespace NhuNguyetSpa.API.Authentication;

/// <summary>
/// Cookie mode of the web client (docs/specs/auth.md, UC-SPA-02 BE-1): the refresh token travels in an HttpOnly cookie
/// instead of the body. The cookie is read and written only when the request carries <see cref="TransportHeader"/>, a
/// custom header that forces a CORS preflight, so another site cannot make the browser use it (BR-AUTH-21).
/// </summary>
public sealed class RefreshTokenCookie
{
    public const string TransportHeader = "X-Auth-Transport";
    private const string CookieTransport = "cookie";
    private const string CookiePath = "/api/v1/auth";

    // The same bound as RefreshTokenRequestValidator: a longer value cannot be one of our tokens.
    private const int MaxTokenLength = 200;

    private readonly IOptions<AuthCookieOptions> _options;

    public RefreshTokenCookie(IOptions<AuthCookieOptions> options) => _options = options;

    public static bool IsRequested(HttpRequest request) =>
        string.Equals(request.Headers[TransportHeader], CookieTransport, StringComparison.OrdinalIgnoreCase);

    /// <summary>The token from the cookie, or null when it is missing or cannot be a token.</summary>
    public string? Read(HttpRequest request) =>
        request.Cookies.TryGetValue(_options.Value.Name, out var value) && !string.IsNullOrWhiteSpace(value) && value.Length <= MaxTokenLength
            ? value
            : null;

    public void Write(HttpResponse response, string token, DateTime expiresAtUtc) =>
        response.Cookies.Append(_options.Value.Name, token, CreateOptions(expiresAtUtc));

    public void Clear(HttpResponse response) => response.Cookies.Delete(_options.Value.Name, CreateOptions(null));

    private CookieOptions CreateOptions(DateTime? expiresAtUtc) => new()
    {
        HttpOnly = true,
        Secure = _options.Value.Secure,
        SameSite = SameSiteMode.Strict,
        Path = CookiePath,
        Expires = expiresAtUtc is null ? null : new DateTimeOffset(DateTime.SpecifyKind(expiresAtUtc.Value, DateTimeKind.Utc)),
    };
}
