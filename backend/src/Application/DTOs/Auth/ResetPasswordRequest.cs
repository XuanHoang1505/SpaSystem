namespace NhuNguyetSpa.Application.DTOs.Auth;

public sealed record ResetPasswordRequest(string ResetToken, string NewPassword, string ConfirmPassword);
