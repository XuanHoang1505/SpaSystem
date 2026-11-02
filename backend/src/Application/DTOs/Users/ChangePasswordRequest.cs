namespace NhuNguyetSpa.Application.DTOs.Users;

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword, string ConfirmPassword);
