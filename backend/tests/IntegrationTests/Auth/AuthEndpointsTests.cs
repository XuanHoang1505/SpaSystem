using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Infrastructure.Authentication;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Auth;

/// <summary>End-to-end checks for docs/specs/auth.md (AUTH-T01..T09) against a real PostgreSQL container.</summary>
[Collection(PostgresCollection.Name)]
public sealed class AuthEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;

    public AuthEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    private const string Password = "Spa@12345";
    private AuthApiFactory _factory = null!;
    private HttpClient _client = null!;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _client = _factory.CreateClient();
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task LoginWithEmailAndPhoneReturnsTokens()
    {
        var user = await _factory.CreateUserAsync(Password);

        var byEmail = await Login(user.Email, Password);
        var byPhone = await Login(user.PhoneNumber, Password);

        foreach (var (response, body) in new[] { byEmail, byPhone })
        {
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var data = body.RootElement.GetProperty("data");
            data.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
            data.GetProperty("refreshToken").GetString().Should().NotBeNullOrEmpty();
            data.GetProperty("user").GetProperty("role").GetString().Should().Be("owner");
            data.GetProperty("user").GetProperty("id").GetGuid().Should().Be(user.Id);
        }
        (await RefreshTokensOf(user.Id)).Should().HaveCount(2);
    }

    [Fact]
    public async Task LoginWithUppercaseEmailSucceeds()
    {
        var user = await _factory.CreateUserAsync(Password);

        var (response, _) = await Login("  " + user.Email.ToUpperInvariant() + " ", Password);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task WrongPasswordAndUnknownEmailReturnSameError()
    {
        var user = await _factory.CreateUserAsync(Password);

        var wrongPassword = await Login(user.Email, "Wrong@123");
        var unknownEmail = await Login("nobody-" + Guid.NewGuid() + "@spa.test", Password);

        foreach (var (response, body) in new[] { wrongPassword, unknownEmail })
        {
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            Code(body).Should().Be("invalid_credentials");
        }
        Message(wrongPassword.Body).Should().Be(Message(unknownEmail.Body));
    }

    [Theory]
    [InlineData(UserStatus.Locked, "account_locked")]
    [InlineData(UserStatus.Inactive, "account_inactive")]
    public async Task NonActiveAccountsAreForbidden(UserStatus status, string code)
    {
        var user = await _factory.CreateUserAsync(Password, status);

        var (response, body) = await Login(user.Email, Password);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        Code(body).Should().Be(code);
    }

    [Fact]
    public async Task RefreshRotatesAndOldTokenStopsWorking()
    {
        var user = await _factory.CreateUserAsync(Password);
        var original = RefreshTokenFrom((await Login(user.Email, Password)).Body);

        var (rotated, rotatedBody) = await Refresh(original);
        rotated.StatusCode.Should().Be(HttpStatusCode.OK);
        var next = RefreshTokenFrom(rotatedBody);
        next.Should().NotBe(original);

        // Past the 30-second grace window of BR-AUTH-22, so the reuse counts as a theft (BR-AUTH-04).
        _factory.Clock.Offset = TimeSpan.FromSeconds(31);
        var (reused, reusedBody) = await Refresh(original);
        reused.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        Code(reusedBody).Should().Be("invalid_refresh_token");

        (await Refresh(next)).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized, "reusing a revoked token ends every session");
        (await RefreshTokensOf(user.Id)).Should().ContainSingle("BR-AUTH-23 deletes the active tokens, only the rotated one stays marked")
            .Which.RevokedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task ReuseWithinGraceWindowDoesNotEndTheNewSession()
    {
        var user = await _factory.CreateUserAsync(Password);
        var original = RefreshTokenFrom((await Login(user.Email, Password)).Body);
        var next = RefreshTokenFrom((await Refresh(original)).Body);

        (await Refresh(original)).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await Refresh(next)).Response.StatusCode.Should().Be(HttpStatusCode.OK, "BR-AUTH-22: within 30 seconds it is a concurrent refresh");
    }

    [Fact]
    public async Task ExpiredRefreshTokenIsRejected()
    {
        var user = await _factory.CreateUserAsync(Password);
        const string expired = "expired-refresh-token-for-test";
        using (var scope = _factory.Services.CreateScope())
        {
            var hash = scope.ServiceProvider.GetRequiredService<ITokenService>().HashRefreshToken(expired);
            await using var context = _postgres.CreateContext();
            context.RefreshTokens.Add(new RefreshToken
            {
                UserId = user.Id, TokenHash = hash, ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1), CreatedAtUtc = DateTime.UtcNow.AddDays(-7),
            });
            await context.SaveChangesAsync();
        }

        var (response, body) = await Refresh(expired);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        Code(body).Should().Be("invalid_refresh_token");
    }

    [Fact]
    public async Task LogoutRevokesRefreshToken()
    {
        var user = await _factory.CreateUserAsync(Password);
        var login = (await Login(user.Email, Password)).Body;

        var (logout, _) = await AuthApiFactory.PostAsync(_client, "/api/v1/auth/logout",
            new { refreshToken = RefreshTokenFrom(login) }, AccessTokenFrom(login));

        logout.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await Refresh(RefreshTokenFrom(login))).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task LogoutWithoutBearerReturnsEnvelope401()
    {
        var (response, body) = await AuthApiFactory.PostAsync(_client, "/api/v1/auth/logout", new { refreshToken = "anything" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        body.RootElement.GetProperty("success").GetBoolean().Should().BeFalse();
        Code(body).Should().Be("unauthorized");
        body.RootElement.GetProperty("traceId").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task LogoutRejectsTamperedAccessToken()
    {
        var user = await _factory.CreateUserAsync(Password);
        var login = (await Login(user.Email, Password)).Body;
        var parts = AccessTokenFrom(login).Split('.');
        parts[2] = (parts[2][0] == 'A' ? "B" : "A") + parts[2][1..];

        var (response, body) = await AuthApiFactory.PostAsync(_client, "/api/v1/auth/logout",
            new { refreshToken = RefreshTokenFrom(login) }, string.Join('.', parts));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        Code(body).Should().Be("unauthorized");
        (await Refresh(RefreshTokenFrom(login))).Response.StatusCode.Should().Be(HttpStatusCode.OK, "the refresh token was not revoked");
    }

    [Fact]
    public async Task LogoutRejectsExpiredAccessToken()
    {
        var user = await _factory.CreateUserAsync(Password);
        var refreshToken = RefreshTokenFrom((await Login(user.Email, Password)).Body);
        var tokens = new JwtTokenService(Options.Create(new JwtOptions { SecretKey = AuthApiFactory.SecretKey }));
        var expired = tokens.CreateAccessToken(user, DateTime.UtcNow.AddMinutes(-20)).Token;

        var (response, body) = await AuthApiFactory.PostAsync(_client, "/api/v1/auth/logout", new { refreshToken }, expired);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        Code(body).Should().Be("unauthorized");
        (await Refresh(refreshToken)).Response.StatusCode.Should().Be(HttpStatusCode.OK, "the refresh token was not revoked");
    }

    [Fact]
    public async Task LogoutIgnoresTokenOfAnotherUser()
    {
        var alice = await _factory.CreateUserAsync(Password);
        var bob = await _factory.CreateUserAsync(Password);
        var aliceLogin = (await Login(alice.Email, Password)).Body;
        var bobLogin = (await Login(bob.Email, Password)).Body;

        var (logout, _) = await AuthApiFactory.PostAsync(_client, "/api/v1/auth/logout",
            new { refreshToken = RefreshTokenFrom(bobLogin) }, AccessTokenFrom(aliceLogin));

        logout.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await Refresh(RefreshTokenFrom(bobLogin))).Response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ConcurrentRefreshWithSameTokenSucceedsOnce()
    {
        var user = await _factory.CreateUserAsync(Password);
        var token = RefreshTokenFrom((await Login(user.Email, Password)).Body);

        var results = await Task.WhenAll(Refresh(token), Refresh(token));

        results.Count(result => result.Response.StatusCode == HttpStatusCode.OK).Should().Be(1);
        results.Count(result => result.Response.StatusCode == HttpStatusCode.Unauthorized).Should().Be(1);
    }

    [Fact]
    public async Task LoginIsRateLimitedAfterTenRequests()
    {
        var statuses = new List<HttpStatusCode>();
        JsonDocument last = null!;
        for (var attempt = 0; attempt < 11; attempt++)
        {
            var (response, body) = await Login("limit-" + Guid.NewGuid() + "@spa.test", Password);
            statuses.Add(response.StatusCode);
            last = body;
        }

        statuses.Take(10).Should().OnlyContain(status => status == HttpStatusCode.Unauthorized);
        statuses[10].Should().Be(HttpStatusCode.TooManyRequests);
        Code(last).Should().Be("rate_limited");
    }

    [Fact]
    public async Task MissingJwtKeyDoesNotBreakStartupButLoginFails()
    {
        await using var factory = new AuthApiFactory(_postgres.ConnectionString, secretKey: null);
        using var client = factory.CreateClient();
        var user = await factory.CreateUserAsync(Password);

        (await client.GetAsync("/health/live")).StatusCode.Should().Be(HttpStatusCode.OK);
        var (response, body) = await AuthApiFactory.PostAsync(client, "/api/v1/auth/login", new { login = user.Email, password = Password });

        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        Code(body).Should().Be("internal_error");
        body.RootElement.ToString().Should().NotContain("SecretKey").And.NotContain("JWT_KEY");
    }

    private Task<(HttpResponseMessage Response, JsonDocument Body)> Login(string login, string password) =>
        AuthApiFactory.PostAsync(_client, "/api/v1/auth/login", new { login, password });

    private Task<(HttpResponseMessage Response, JsonDocument Body)> Refresh(string refreshToken) =>
        AuthApiFactory.PostAsync(_client, "/api/v1/auth/refresh", new { refreshToken });

    private async Task<List<RefreshToken>> RefreshTokensOf(Guid userId)
    {
        await using var context = _postgres.CreateContext();
        return await context.RefreshTokens.AsNoTracking().Where(token => token.UserId == userId).ToListAsync();
    }

    private static string AccessTokenFrom(JsonDocument body) => body.RootElement.GetProperty("data").GetProperty("accessToken").GetString()!;
    private static string RefreshTokenFrom(JsonDocument body) => body.RootElement.GetProperty("data").GetProperty("refreshToken").GetString()!;
    private static string Code(JsonDocument body) => body.RootElement.GetProperty("errors")[0].GetProperty("code").GetString()!;
    private static string Message(JsonDocument body) => body.RootElement.GetProperty("message").GetString()!;
}
