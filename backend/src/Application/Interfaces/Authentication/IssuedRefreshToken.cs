namespace NhuNguyetSpa.Application.Interfaces.Authentication;

/// <summary><paramref name="Token"/> goes to the client only; <paramref name="TokenHash"/> is what gets stored.</summary>
public sealed record IssuedRefreshToken(string Token, string TokenHash, DateTime ExpiresAtUtc);
