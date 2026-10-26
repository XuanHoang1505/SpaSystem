namespace NhuNguyetSpa.Application.Interfaces.Authentication;

/// <summary>A valid reset token's subject and the password stamp it was issued for (BR-AUTH-09).</summary>
public sealed record PasswordResetClaims(Guid UserId, string PasswordStamp);
