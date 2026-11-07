using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Auth;

/// <summary>
/// Web session in an HttpOnly cookie (docs/specs/auth.md, UC-SPA-02 BE-1, AUTH-T43..T52). Cookies are read and sent by hand so
/// every Set-Cookie header can be asserted.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class AuthCookieEndpointsTests : IAsyncLifetime
{
    private const string Password = "Spa@12345";
    private const string CookieName = "spa_refresh_token";
    private const string TransportHeader = "X-Auth-Transport";

    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private HttpClient _client = null!;

    public AuthCookieEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task LoginInCookieModeSetsHttpOnlyCookieAndHidesTokenFromBody()
    {
        var user = await _factory.CreateUserAsync(Password);

        var (response, body) = await Send("/api/v1/auth/login", new { login = user.Email, password = Password });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = body.RootElement.GetProperty("data");
        data.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
        data.GetProperty("refreshToken").ValueKind.Should().Be(JsonValueKind.Null);
        data.GetProperty("refreshTokenExpiresAtUtc").ValueKind.Should().Be(JsonValueKind.Null);
        var header = SetCookie(response)!.ToLowerInvariant();
        header.Should().Contain("httponly").And.Contain("samesite=strict").And.Contain("path=/api/v1/auth");
        var expires = DateTime.Parse(header.Split("expires=")[1].Split(';')[0]).ToUniversalTime();
        expires.Should().BeCloseTo(DateTime.UtcNow.AddDays(7), TimeSpan.FromMinutes(2));
        CookieValue(response).Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task RefreshInCookieModeRotatesTheCookie()
    {
        var user = await _factory.CreateUserAsync(Password);
        var first = CookieValue((await Send("/api/v1/auth/login", new { login = user.Email, password = Password })).Response)!;

        var (response, body) = await Send("/api/v1/auth/refresh", cookie: first);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body.RootElement.GetProperty("data").GetProperty("refreshToken").ValueKind.Should().Be(JsonValueKind.Null);
        var second = CookieValue(response);
        second.Should().NotBeNullOrEmpty().And.NotBe(first);
        await using var context = _postgres.CreateContext();
        (await context.RefreshTokens.AsNoTracking().CountAsync(token => token.UserId == user.Id && token.RevokedAtUtc != null)).Should().Be(1);
    }

    [Fact]
    public async Task RefreshInCookieModeWithoutCookieIsUnauthorized()
    {
        var (response, body) = await Send("/api/v1/auth/refresh");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        Code(body).Should().Be("invalid_refresh_token");
    }

    [Fact]
    public async Task RefreshInCookieModeWithGarbageCookieClearsIt()
    {
        var (response, body) = await Send("/api/v1/auth/refresh", cookie: new string('x', 500));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        Code(body).Should().Be("invalid_refresh_token");
        IsCleared(response).Should().BeTrue();
    }

    [Fact]
    public async Task RefreshInCookieModeForLockedAccountClearsCookie()
    {
        var user = await _factory.CreateUserAsync(Password);
        var cookie = CookieValue((await Send("/api/v1/auth/login", new { login = user.Email, password = Password })).Response)!;
        await using (var context = _postgres.CreateContext())
            await context.Users.Where(row => row.Id == user.Id).ExecuteUpdateAsync(set => set.SetProperty(row => row.Status, UserStatus.Locked));

        var (response, body) = await Send("/api/v1/auth/refresh", cookie: cookie);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        Code(body).Should().Be("account_locked");
        IsCleared(response).Should().BeTrue();
    }

    [Fact]
    public async Task CookieWithoutTransportHeaderIsIgnored()
    {
        var user = await _factory.CreateUserAsync(Password);
        var cookie = CookieValue((await Send("/api/v1/auth/login", new { login = user.Email, password = Password })).Response)!;

        var (response, body) = await Send("/api/v1/auth/refresh", new { }, cookie: cookie, cookieMode: false);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        Code(body).Should().Be("validation_error");
    }

    [Fact]
    public async Task LogoutInCookieModeNeedsNoBearerAndClearsCookie()
    {
        var user = await _factory.CreateUserAsync(Password);
        var cookie = CookieValue((await Send("/api/v1/auth/login", new { login = user.Email, password = Password })).Response)!;

        var (response, _) = await Send("/api/v1/auth/logout", cookie: cookie);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        IsCleared(response).Should().BeTrue();
        await using (var context = _postgres.CreateContext())
            (await context.RefreshTokens.AsNoTracking().AnyAsync(token => token.UserId == user.Id)).Should().BeFalse("BR-AUTH-23 deletes the row");
        (await Send("/api/v1/auth/refresh", cookie: cookie)).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ReuseWithinGraceWindowKeepsOtherSessionsButLaterReuseEndsThem()
    {
        var user = await _factory.CreateUserAsync(Password);
        var first = CookieValue((await Send("/api/v1/auth/login", new { login = user.Email, password = Password })).Response)!;
        var second = CookieValue((await Send("/api/v1/auth/refresh", cookie: first)).Response)!;

        _factory.Clock.Offset = TimeSpan.FromSeconds(10);
        (await Send("/api/v1/auth/refresh", cookie: first)).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var (stillValid, _) = await Send("/api/v1/auth/refresh", cookie: second);
        stillValid.StatusCode.Should().Be(HttpStatusCode.OK, "a concurrent refresh within 30 seconds is not a theft");
        var third = CookieValue(stillValid)!;

        _factory.Clock.Offset = TimeSpan.FromSeconds(45);
        (await Send("/api/v1/auth/refresh", cookie: second)).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await Send("/api/v1/auth/refresh", cookie: third)).Response.StatusCode
            .Should().Be(HttpStatusCode.Unauthorized, "a rotated token reused after the grace window ends every session");
    }

    [Fact]
    public async Task OldCookieAfterPasswordChangeDoesNotEndTheNewSession()
    {
        var user = await _factory.CreateUserAsync(Password, role: UserRole.Customer);
        var (login, loginBody) = await Send("/api/v1/auth/login", new { login = user.Email, password = Password });
        var oldCookie = CookieValue(login)!;
        var access = loginBody.RootElement.GetProperty("data").GetProperty("accessToken").GetString()!;

        using (var change = new HttpRequestMessage(HttpMethod.Put, "/api/v1/me/password"))
        {
            change.Content = JsonContent.Create(new { currentPassword = Password, newPassword = "Moi@12345", confirmPassword = "Moi@12345" });
            change.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", access);
            (await _client.SendAsync(change)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        }
        var newCookie = CookieValue((await Send("/api/v1/auth/login", new { login = user.Email, password = "Moi@12345" })).Response)!;

        (await Send("/api/v1/auth/refresh", cookie: oldCookie)).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await Send("/api/v1/auth/refresh", cookie: newCookie)).Response.StatusCode
            .Should().Be(HttpStatusCode.OK, "BR-AUTH-23: an explicitly revoked token is not a theft signal");
    }

    [Fact]
    public async Task RefreshHasItsOwnRateLimit()
    {
        var statuses = new List<HttpStatusCode>();
        for (var attempt = 0; attempt < 31; attempt++)
            statuses.Add((await Send("/api/v1/auth/refresh")).Response.StatusCode);

        statuses.Take(30).Should().OnlyContain(status => status == HttpStatusCode.Unauthorized);
        statuses[30].Should().Be(HttpStatusCode.TooManyRequests);
        var user = await _factory.CreateUserAsync(Password);
        (await Send("/api/v1/auth/login", new { login = user.Email, password = Password })).Response.StatusCode
            .Should().Be(HttpStatusCode.OK, "login is counted by the separate auth limit");
    }

    [Theory]
    [InlineData("http://localhost:5173", true)]
    [InlineData("http://evil.test", false)]
    public async Task PreflightAllowsCredentialsOnlyForConfiguredOrigins(string origin, bool allowed)
    {
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/v1/auth/refresh");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "content-type,x-auth-transport");

        var response = await _client.SendAsync(request);

        if (allowed)
        {
            response.Headers.GetValues("Access-Control-Allow-Origin").Should().ContainSingle().Which.Should().Be(origin);
            response.Headers.GetValues("Access-Control-Allow-Credentials").Should().ContainSingle().Which.Should().Be("true");
        }
        else
        {
            response.Headers.Contains("Access-Control-Allow-Origin").Should().BeFalse();
            response.Headers.Contains("Access-Control-Allow-Credentials").Should().BeFalse();
        }
    }

    private async Task<(HttpResponseMessage Response, JsonDocument Body)> Send(string path, object? payload = null, string? cookie = null,
        bool cookieMode = true)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path);
        if (payload is not null) request.Content = JsonContent.Create(payload);
        if (cookieMode) request.Headers.Add(TransportHeader, "cookie");
        if (cookie is not null) request.Headers.Add("Cookie", $"{CookieName}={cookie}");
        var response = await _client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        return (response, JsonDocument.Parse(string.IsNullOrEmpty(text) ? "{}" : text));
    }

    private static string? SetCookie(HttpResponseMessage response) =>
        response.Headers.TryGetValues("Set-Cookie", out var values) ? values.SingleOrDefault(value => value.StartsWith(CookieName + "=")) : null;

    private static string? CookieValue(HttpResponseMessage response) =>
        SetCookie(response)?.Split(';')[0][(CookieName.Length + 1)..] is { Length: > 0 } value ? value : null;

    private static bool IsCleared(HttpResponseMessage response) =>
        SetCookie(response) is { } header && header.StartsWith(CookieName + "=;") && header.Contains("1970");

    private static string Code(JsonDocument body) => body.RootElement.GetProperty("errors")[0].GetProperty("code").GetString()!;
}
