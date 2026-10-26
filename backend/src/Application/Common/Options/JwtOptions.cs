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
}
