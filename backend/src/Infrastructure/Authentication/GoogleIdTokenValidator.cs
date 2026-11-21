using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Application.UseCases.Auth;

namespace NhuNguyetSpa.Infrastructure.Authentication;

/// <summary>
/// Checks Google ID tokens offline against Google's published signing keys (fetched from the OpenID discovery document and
/// cached by <see cref="ConfigurationManager{T}"/>): RS256 signature, issuer, audience = <c>GoogleSignIn:ClientId</c>, lifetime.
/// </summary>
public sealed class GoogleIdTokenValidator : IGoogleTokenValidator
{
    public const string MetadataAddress = "https://accounts.google.com/.well-known/openid-configuration";
    private static readonly string[] Issuers = ["https://accounts.google.com", "accounts.google.com"];
    private static readonly JsonWebTokenHandler Handler = new();

    private readonly IConfigurationManager<OpenIdConnectConfiguration> _configuration;
    private readonly IOptions<GoogleSignInOptions> _options;
    private readonly ILogger<GoogleIdTokenValidator> _logger;

    public GoogleIdTokenValidator(IOptions<GoogleSignInOptions> options, ILogger<GoogleIdTokenValidator> logger)
    {
        _options = options;
        _logger = logger;
        _configuration = new ConfigurationManager<OpenIdConnectConfiguration>(
            MetadataAddress, new OpenIdConnectConfigurationRetriever(), new HttpDocumentRetriever { RequireHttps = true });
    }

    public async Task<GoogleIdentity?> ValidateAsync(string idToken, CancellationToken cancellationToken)
    {
        var clientId = _options.Value.ClientId;
        if (string.IsNullOrWhiteSpace(clientId))
            throw GoogleSignInErrors.Unavailable();

        OpenIdConnectConfiguration configuration;
        try
        {
            configuration = await _configuration.GetConfigurationAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception, "Could not load Google's signing keys.");
            throw GoogleSignInErrors.Unavailable();
        }

        var result = await Handler.ValidateTokenAsync(idToken, new TokenValidationParameters
        {
            ValidIssuers = Issuers,
            ValidAudience = clientId,
            IssuerSigningKeys = configuration.SigningKeys,
            ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
            ClockSkew = TimeSpan.FromMinutes(1),
        });
        if (!result.IsValid || result.SecurityToken is not JsonWebToken token)
        {
            // Google rotates its keys: an unknown key id means our cached set is old.
            if (result.Exception is SecurityTokenSignatureKeyNotFoundException)
                _configuration.RequestRefresh();
            _logger.LogInformation("Rejected a Google ID token: {Reason}", result.Exception?.GetType().Name);
            return null;
        }

        if (string.IsNullOrEmpty(token.Subject) || !token.TryGetPayloadValue<string>(JwtRegisteredClaimNames.Email, out var email)
            || string.IsNullOrWhiteSpace(email))
            return null;
        token.TryGetPayloadValue<string>("name", out var name);
        token.TryGetPayloadValue<string>("picture", out var picture);
        return new GoogleIdentity(token.Subject, email.Trim(), IsEmailVerified(token), string.IsNullOrWhiteSpace(name) ? null : name,
            string.IsNullOrWhiteSpace(picture) ? null : picture);
    }

    /// <summary>Google sends <c>email_verified</c> as a JSON boolean; older tokens used the string "true".</summary>
    private static bool IsEmailVerified(JsonWebToken token)
    {
        if (token.TryGetPayloadValue<bool>("email_verified", out var verified))
            return verified;
        return token.TryGetPayloadValue<string>("email_verified", out var text) && string.Equals(text, "true", StringComparison.OrdinalIgnoreCase);
    }
}
