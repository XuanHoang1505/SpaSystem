namespace NhuNguyetSpa.Application.Interfaces.Authentication;

public sealed record AccessToken(string Token, DateTime ExpiresAtUtc);
