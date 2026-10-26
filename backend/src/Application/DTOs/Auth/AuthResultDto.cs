namespace NhuNguyetSpa.Application.DTOs.Auth;

public sealed record AuthResultDto(
    string AccessToken,
    DateTime AccessTokenExpiresAtUtc,
    string RefreshToken,
    DateTime RefreshTokenExpiresAtUtc,
    AuthUserDto User);
