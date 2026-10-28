using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Infrastructure.Authentication;

namespace NhuNguyetSpa.API.Extensions;

/// <summary>JWT bearer authentication and the login rate limit (docs/specs/auth.md).</summary>
public static class AuthenticationExtensions
{
    public const string AuthRateLimitPolicy = "auth";
    private const int AuthPermitLimit = 10;

    public static IServiceCollection AddApiAuthentication(this IServiceCollection services)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        // The bearer handler initialises on every request (UseAuthentication), so it must not touch the validated
        // JwtOptions up front: issuer/audience are read unvalidated (non-secret, with defaults) and the signing key is
        // resolved only when a token is actually validated. A missing JWT_KEY then fails bearer requests with 401
        // instead of breaking health checks and anonymous endpoints.
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IConfiguration, IOptions<JwtOptions>>((bearer, configuration, validatedJwt) =>
            {
                var jwt = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
                bearer.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeyResolver = (_, _, _, _) => [JwtTokenService.CreateSigningKey(validatedJwt.Value.SecretKey)],
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = "name",
                    // MapInboundClaims (default true) turns "sub" into NameIdentifier and "role" into ClaimTypes.Role,
                    // which HttpCurrentUserService reads.
                    RoleClaimType = ClaimTypes.Role,
                };
                bearer.Events = new JwtBearerEvents
                {
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();
                        await WriteErrorAsync(context.HttpContext, StatusCodes.Status401Unauthorized, "unauthorized", "Vui lòng đăng nhập.");
                    },
                    OnForbidden = context =>
                        WriteErrorAsync(context.HttpContext, StatusCodes.Status403Forbidden, "forbidden", "Bạn không có quyền thực hiện thao tác này."),
                };
            });
        services.AddAuthorization(options =>
        {
            foreach (var (permission, roles) in Permissions.Roles)
                options.AddPolicy(permission, policy => policy.RequireAuthenticatedUser().RequireRole(roles));
        });

        services.AddRateLimiter(options =>
        {
            options.AddPolicy(AuthRateLimitPolicy, context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = AuthPermitLimit, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
            options.OnRejected = (context, _) => new ValueTask(WriteErrorAsync(context.HttpContext, StatusCodes.Status429TooManyRequests,
                "rate_limited", "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút."));
        });
        return services;
    }

    private static Task WriteErrorAsync(HttpContext context, int status, string code, string message)
    {
        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(
            new ApiResponse<object>(false, message, null, [new ErrorDetail(code, message)], context.TraceIdentifier),
            context.RequestAborted);
    }
}
