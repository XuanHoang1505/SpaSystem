namespace NhuNguyetSpa.Application.Interfaces.Authentication;

/// <summary>
/// What a verified Google ID token says about the person; <paramref name="Subject"/> is Google's stable account id and
/// <paramref name="PictureUrl"/> the profile photo, if any.
/// </summary>
public sealed record GoogleIdentity(string Subject, string Email, bool EmailVerified, string? Name, string? PictureUrl = null);
