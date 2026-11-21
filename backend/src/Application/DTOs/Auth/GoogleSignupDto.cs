namespace NhuNguyetSpa.Application.DTOs.Auth;

/// <summary>Returned when no account matches the Google account yet; the web asks for a phone number and sends the token back.</summary>
public sealed record GoogleSignupDto(string SignupToken, DateTime ExpiresAtUtc, string Email, string FullName);
