namespace NhuNguyetSpa.Application.UseCases.Auth;

/// <summary>Registration data kept in <c>otp_codes.pending_registration</c> until the OTP is verified; the password is already hashed.</summary>
public sealed record PendingRegistration(string FullName, string PhoneNumber, string PasswordHash);
