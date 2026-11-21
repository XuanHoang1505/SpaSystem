namespace NhuNguyetSpa.Application.DTOs.Auth;

/// <summary>Either a session (<paramref name="Session"/>) or, when <paramref name="ProfileRequired"/>, the sign-up step.</summary>
public sealed record GoogleSignInResultDto(bool ProfileRequired, AuthResultDto? Session, GoogleSignupDto? Signup)
{
    public static GoogleSignInResultDto SignedIn(AuthResultDto session) => new(false, session, null);

    public static GoogleSignInResultDto NeedsProfile(GoogleSignupDto signup) => new(true, null, signup);
}
