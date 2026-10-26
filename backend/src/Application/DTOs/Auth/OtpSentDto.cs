namespace NhuNguyetSpa.Application.DTOs.Auth;

public sealed record OtpSentDto(string Email, DateTime ExpiresAtUtc);
