namespace NhuNguyetSpa.Application.DTOs.Auth;

/// <summary>Finishes a first Google sign-in: the account needs a phone number, which Google does not give.</summary>
public sealed record GoogleSignupCompleteRequest(string SignupToken, string FullName, string PhoneNumber);
