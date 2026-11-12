namespace NhuNguyetSpa.Application.DTOs.Auth;

/// <param name="ResendAvailableAtUtc">Earliest time a new code may be requested (BR-AUTH-25).</param>
public sealed record OtpSentDto(string Email, DateTime ExpiresAtUtc, DateTime ResendAvailableAtUtc);
