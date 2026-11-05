namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>
/// Section <c>Jwt</c>. Non-secret defaults live in appsettings.json; <c>SecretKey</c> comes from <c>JWT_KEY</c> in .env.
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    public const int MinimumSecretKeyLength = 32;

    public string SecretKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = "NhuNguyetSpa.API";
    public string Audience { get; set; } = "NhuNguyetSpa.Clients";
    public int AccessTokenExpirationMinutes { get; set; } = 15;
    public int RefreshTokenExpirationDays { get; set; } = 7;

    /// <summary>
    /// BR-AUTH-22 (Q-66): a rotated token sent again within this many seconds is a concurrent refresh (two tabs sharing
    /// one cookie), answered with 401 but not treated as theft.
    /// </summary>
    public int RefreshReuseGraceSeconds { get; set; } = 30;
}
