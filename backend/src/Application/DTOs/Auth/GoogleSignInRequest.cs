namespace NhuNguyetSpa.Application.DTOs.Auth;

/// <summary><paramref name="IdToken"/> is the <c>credential</c> that Google Identity Services gives the web page.</summary>
public sealed record GoogleSignInRequest(string IdToken);
