namespace NhuNguyetSpa.Application.DTOs.Auth;

/// <summary>The refresh token fields are null when the API keeps the token in the web cookie (BR-AUTH-20).</summary>
public sealed record AuthResultDto(
    string AccessToken,
    DateTime AccessTokenExpiresAtUtc,
    string? RefreshToken,
    DateTime? RefreshTokenExpiresAtUtc,
    AuthUserDto User);
