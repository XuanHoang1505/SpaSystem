namespace NhuNguyetSpa.Application.DTOs.Auth;

/// <param name="Login">Email or phone number.</param>
public sealed record LoginRequest(string Login, string Password);
