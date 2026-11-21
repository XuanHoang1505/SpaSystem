namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>GoogleSignIn</c>: sign-in with Google on the web (docs/specs/auth.md, Q-84). <c>GOOGLE_CLIENT_ID</c> in .env.</summary>
public sealed class GoogleSignInOptions
{
    public const string SectionName = "GoogleSignIn";

    /// <summary>OAuth client ID of the web app; ID tokens must carry it as audience. Empty → the endpoints return 503.</summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>How long the first-time sign-up token lasts while the customer enters a phone number.</summary>
    public int SignupTokenExpirationMinutes { get; set; } = 10;

    /// <summary>Staff and the owner may sign in with a Google account of their email; they are never created by Google sign-in.</summary>
    public bool AllowStaffAndOwner { get; set; } = true;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ClientId);
}
