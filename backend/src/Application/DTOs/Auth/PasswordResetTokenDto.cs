namespace NhuNguyetSpa.Application.DTOs.Auth;

public sealed record PasswordResetTokenDto(string ResetToken, DateTime ExpiresAtUtc);
