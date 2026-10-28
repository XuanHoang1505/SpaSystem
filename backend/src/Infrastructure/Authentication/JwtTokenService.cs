using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence.Conversions;

namespace NhuNguyetSpa.Infrastructure.Authentication;

/// <summary>HMAC-SHA256 access tokens, opaque refresh tokens and password-reset tokens (docs/specs/auth.md, BR-AUTH-01/02/09).</summary>
public sealed class JwtTokenService : ITokenService
{
    private const int RefreshTokenBytes = 64;
    public const string PasswordResetAudience = "NhuNguyetSpa.PasswordReset";
    private const string PasswordStampClaim = "pwd";
    private static readonly JsonWebTokenHandler Handler = new();

    private readonly IOptions<JwtOptions> _options;

    public JwtTokenService(IOptions<JwtOptions> options) => _options = options;

    public AccessToken CreateAccessToken(User user, DateTime nowUtc)
    {
        ArgumentNullException.ThrowIfNull(user);
        var jwt = _options.Value;
        var expiresAtUtc = nowUtc.AddMinutes(jwt.AccessTokenExpirationMinutes);
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = jwt.Issuer,
            Audience = jwt.Audience,
            IssuedAt = nowUtc,
            NotBefore = nowUtc,
            Expires = expiresAtUtc,
            Claims = new Dictionary<string, object>
            {
                [JwtRegisteredClaimNames.Sub] = user.Id.ToString(),
                [JwtRegisteredClaimNames.Jti] = Guid.NewGuid().ToString(),
                ["role"] = SnakeCaseEnumConverter<UserRole>.ToProvider(user.Role),
                ["name"] = user.FullName,
            },
            SigningCredentials = new SigningCredentials(CreateSigningKey(jwt.SecretKey), SecurityAlgorithms.HmacSha256),
        };
        return new AccessToken(Handler.CreateToken(descriptor), expiresAtUtc);
    }

    public IssuedRefreshToken CreateRefreshToken(DateTime nowUtc)
    {
        var token = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(RefreshTokenBytes));
        return new IssuedRefreshToken(token, HashRefreshToken(token), nowUtc.AddDays(_options.Value.RefreshTokenExpirationDays));
    }

    public string HashRefreshToken(string token) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public AccessToken CreatePasswordResetToken(User user, DateTime nowUtc, DateTime expiresAtUtc)
    {
        ArgumentNullException.ThrowIfNull(user);
        var jwt = _options.Value;
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = jwt.Issuer,
            Audience = PasswordResetAudience,
            IssuedAt = nowUtc,
            NotBefore = nowUtc,
            Expires = expiresAtUtc,
            Claims = new Dictionary<string, object>
            {
                [JwtRegisteredClaimNames.Sub] = user.Id.ToString(),
                [JwtRegisteredClaimNames.Jti] = Guid.NewGuid().ToString(),
                [PasswordStampClaim] = ComputePasswordStamp(user.PasswordHash),
            },
            SigningCredentials = new SigningCredentials(CreateSigningKey(jwt.SecretKey), SecurityAlgorithms.HmacSha256),
        };
        return new AccessToken(Handler.CreateToken(descriptor), expiresAtUtc);
    }

    public async Task<PasswordResetClaims?> ReadPasswordResetTokenAsync(string token, DateTime nowUtc)
    {
        var jwt = _options.Value;
        var result = await Handler.ValidateTokenAsync(token, new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = PasswordResetAudience,
            IssuerSigningKey = CreateSigningKey(jwt.SecretKey),
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            // Lifetime is checked below against the application clock so tests can move time.
            ValidateLifetime = false,
        });
        if (!result.IsValid || result.SecurityToken is not JsonWebToken reset || nowUtc >= reset.ValidTo
            || !Guid.TryParse(reset.Subject, out var userId) || !reset.TryGetPayloadValue<string>(PasswordStampClaim, out var stamp))
            return null;
        return new PasswordResetClaims(userId, stamp);
    }

    public string ComputePasswordStamp(string passwordHash) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash)))[..16];

    public static SymmetricSecurityKey CreateSigningKey(string secretKey) => new(Encoding.UTF8.GetBytes(secretKey));
}
