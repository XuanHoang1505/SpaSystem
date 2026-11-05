using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Auth;

/// <summary>End-to-end checks for UC-SPA-01/03 (docs/specs/auth.md, AUTH-T11..T23) against a real PostgreSQL container.</summary>
[Collection(PostgresCollection.Name)]
public sealed class AccountEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;

    public AccountEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    private const string Password = "matkhau123";
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
    public async Task RegisterEndToEndCreatesCustomerWhoCanLogIn()
    {
        var (email, phone) = NewIdentity();

        var (request, requestBody) = await RequestRegistration(email, phone);
        request.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var sent = requestBody.RootElement.GetProperty("data");
        sent.GetProperty("email").GetString().Should().Be(email);
        // BR-AUTH-25: resend allowed 60 seconds after the stored creation time (stamped on save, a few ms after the expiry was
        // computed), and the code itself lives 5 minutes.
        (sent.GetProperty("expiresAtUtc").GetDateTime() - sent.GetProperty("resendAvailableAtUtc").GetDateTime())
            .Should().BeCloseTo(TimeSpan.FromMinutes(4), TimeSpan.FromSeconds(1));
        (await UserExists(email)).Should().BeFalse("AUTH-T13: no account before the OTP is verified");

        var otp = _factory.Mail.LastOtpFor(email);
        var (verify, verifyBody) = await Post("/api/v1/auth/register/verify-otp", new { email = email.ToUpperInvariant(), otp });

        verify.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = verifyBody.RootElement.GetProperty("data").GetProperty("id").GetGuid();
        await using var context = _postgres.CreateContext();
        var user = await context.Users.AsNoTracking().SingleAsync(row => row.Id == id);
        user.Role.Should().Be(UserRole.Customer);
        user.Status.Should().Be(UserStatus.Active);
        (await context.Customers.AnyAsync(row => row.Id == id)).Should().BeTrue();
        var stored = await context.OtpCodes.AsNoTracking().SingleAsync(row => row.Email == email);
        stored.CodeHash.Should().NotContain(otp);
        stored.PendingRegistration.Should().NotContain(Password);
        stored.UsedAtUtc.Should().NotBeNull();

        (await Post("/api/v1/auth/login", new { login = email, password = Password })).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Post("/api/v1/auth/login", new { login = phone, password = Password })).Response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RegisterDuplicateEmailAndPhoneReturn409WithoutMail()
    {
        var existing = await _factory.CreateUserAsync(Password, role: UserRole.Customer);

        var byEmail = await RequestRegistration(existing.Email.ToUpperInvariant(), NewIdentity().Phone);
        var byPhone = await RequestRegistration(NewIdentity().Email, existing.PhoneNumber);

        byEmail.Response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        Code(byEmail.Body).Should().Be("email_exists");
        byPhone.Response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        Code(byPhone.Body).Should().Be("phone_exists");
        _factory.Mail.Sent.Should().BeEmpty();
    }

    [Fact]
    public async Task FiveWrongOtpsLockTheCode()
    {
        var (email, phone) = NewIdentity();
        await RequestRegistration(email, phone);
        var otp = _factory.Mail.LastOtpFor(email);
        var wrong = otp == "000000" ? "111111" : "000000";

        var codes = new List<string>();
        for (var attempt = 0; attempt < 5; attempt++)
            codes.Add(Code((await Verify(email, wrong)).Body));
        var (correct, correctBody) = await Verify(email, otp);

        codes.Should().Equal("otp_invalid", "otp_invalid", "otp_invalid", "otp_invalid", "otp_too_many_attempts");
        correct.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        Code(correctBody).Should().Be("otp_too_many_attempts");
        (await UserExists(email)).Should().BeFalse();
    }

    [Fact]
    public async Task ExpiredOtpReturnsOtpExpired()
    {
        var (email, phone) = NewIdentity();
        await RequestRegistration(email, phone);
        _factory.Clock.Offset = TimeSpan.FromMinutes(5).Add(TimeSpan.FromSeconds(1));

        var (response, body) = await Verify(email, _factory.Mail.LastOtpFor(email));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        Code(body).Should().Be("otp_expired");
    }

    [Fact]
    public async Task ResendCooldownAndOldOtpInvalidated()
    {
        var (email, phone) = NewIdentity();
        await RequestRegistration(email, phone);
        var first = _factory.Mail.LastOtpFor(email);

        var (tooSoon, tooSoonBody) = await RequestRegistration(email, phone);
        tooSoon.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        Code(tooSoonBody).Should().Be("rate_limited");

        _factory.Clock.Offset = TimeSpan.FromSeconds(61);
        (await RequestRegistration(email, phone)).Response.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var second = _factory.Mail.LastOtpFor(email);
        _factory.Mail.SentTo(email).Should().HaveCount(2);

        if (first != second)
            Code((await Verify(email, first)).Body).Should().Be("otp_invalid");
        (await Verify(email, second)).Response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task MailFailureReturns503AndAllowsImmediateRetry()
    {
        var (email, phone) = NewIdentity();
        _factory.Mail.Fail = true;

        var (failed, failedBody) = await RequestRegistration(email, phone);

        failed.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        Code(failedBody).Should().Be("email_send_failed");
        await using (var context = _postgres.CreateContext())
            (await context.OtpCodes.AnyAsync(row => row.Email == email)).Should().BeFalse();

        _factory.Mail.Fail = false;
        (await RequestRegistration(email, phone)).Response.StatusCode.Should().Be(HttpStatusCode.Accepted);
    }

    [Fact]
    public async Task ConcurrentVerifyCreatesOneAccount()
    {
        var (email, phone) = NewIdentity();
        await RequestRegistration(email, phone);
        var otp = _factory.Mail.LastOtpFor(email);

        var results = await Task.WhenAll(Verify(email, otp), Verify(email, otp));

        results.Count(result => result.Response.StatusCode == HttpStatusCode.Created).Should().Be(1);
        results.Count(result => result.Response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.Conflict).Should().Be(1);
        await using var context = _postgres.CreateContext();
        (await context.Users.CountAsync(row => row.Email == email)).Should().Be(1);
    }

    [Fact]
    public async Task ConcurrentRegistrationRequestsSendOneMail()
    {
        var (email, phone) = NewIdentity();

        var results = await Task.WhenAll(RequestRegistration(email, phone), RequestRegistration(email, phone));

        results.Select(result => result.Response.StatusCode).Should()
            .BeEquivalentTo([HttpStatusCode.Accepted, HttpStatusCode.TooManyRequests]);
        _factory.Mail.SentTo(email).Should().ContainSingle();
        await using var context = _postgres.CreateContext();
        (await context.OtpCodes.CountAsync(row => row.Email == email)).Should().Be(1);
    }

    [Fact]
    public async Task ForgotVerifyDoesNotRevealAccount()
    {
        var user = await _factory.CreateUserAsync(Password, role: UserRole.Customer);
        var unknown = NewIdentity().Email;
        var wrong = "000000";

        // One host per email: 2 × (1 request + 5 guesses) would exceed the shared 10/min "auth" limit of a single host.
        foreach (var email in new[] { user.Email, unknown })
        {
            await using var factory = new AuthApiFactory(_postgres.ConnectionString);
            using var client = factory.CreateClient();
            await AuthApiFactory.PostAsync(client, "/api/v1/auth/forgot-password/request-otp", new { email });
            if (factory.Mail.SentTo(email).Count > 0 && factory.Mail.LastOtpFor(email) == wrong)
                wrong = "111111";

            var codes = new List<string>();
            for (var attempt = 0; attempt < 5; attempt++)
                codes.Add(Code((await AuthApiFactory.PostAsync(client, "/api/v1/auth/forgot-password/verify-otp", new { email, otp = wrong })).Body));
            codes.Should().OnlyContain(code => code == "otp_invalid", "the answers for {0} must not differ from an unknown email", email);
        }
    }

    [Fact]
    public async Task ForgotPasswordResponsesAreIdentical()
    {
        var active = await _factory.CreateUserAsync(Password, role: UserRole.Customer);
        var locked = await _factory.CreateUserAsync(Password, UserStatus.Locked, UserRole.Customer);
        var unknown = NewIdentity().Email;

        var responses = new List<(HttpStatusCode Status, string Data)>();
        foreach (var email in new[] { active.Email, locked.Email, unknown })
        {
            var (response, body) = await Post("/api/v1/auth/forgot-password/request-otp", new { email });
            var data = body.RootElement.GetProperty("data");
            responses.Add((response.StatusCode, data.GetProperty("expiresAtUtc").GetDateTime().ToString("yyyy-MM-ddTHH:mm")));
            (data.GetProperty("resendAvailableAtUtc").GetDateTime() - DateTime.UtcNow).Should()
                .BeCloseTo(TimeSpan.FromSeconds(60), TimeSpan.FromSeconds(5), "BR-AUTH-25: the same answer for every email");
            data.GetProperty("email").GetString().Should().Be(email);
            body.RootElement.GetProperty("message").ValueKind.Should().Be(JsonValueKind.Null);
        }

        responses.Should().OnlyContain(response => response.Status == HttpStatusCode.Accepted);
        responses.Select(response => response.Data).Distinct().Should().HaveCountLessThanOrEqualTo(2, "only clock rollover may differ");
        _factory.Mail.Sent.Should().ContainSingle().Which.ToEmail.Should().Be(active.Email);

        (await Post("/api/v1/auth/forgot-password/request-otp", new { email = active.Email })).Response.StatusCode
            .Should().Be(HttpStatusCode.Accepted, "a resend within the cooldown is silent, not 429");
        _factory.Mail.Sent.Should().ContainSingle();
    }

    [Fact]
    public async Task PasswordResetEndToEnd()
    {
        var user = await _factory.CreateUserAsync(Password, role: UserRole.Customer);
        var (_, loginBody) = await Post("/api/v1/auth/login", new { login = user.Email, password = Password });
        var oldRefresh = loginBody.RootElement.GetProperty("data").GetProperty("refreshToken").GetString()!;

        var resetToken = await ObtainResetToken(user.Email);
        var (reset, _) = await Post("/api/v1/auth/forgot-password/reset",
            new { resetToken, newPassword = "matkhaumoi9", confirmPassword = "matkhaumoi9" });

        reset.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await Post("/api/v1/auth/login", new { login = user.Email, password = "matkhaumoi9" })).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Post("/api/v1/auth/login", new { login = user.Email, password = Password })).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await Post("/api/v1/auth/refresh", new { refreshToken = oldRefresh })).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ResetTokenCannotBeReusedOrReplacedByAccessToken()
    {
        var user = await _factory.CreateUserAsync(Password, role: UserRole.Customer);
        var resetToken = await ObtainResetToken(user.Email);
        var payload = new { resetToken, newPassword = "matkhaumoi9", confirmPassword = "matkhaumoi9" };
        (await Post("/api/v1/auth/forgot-password/reset", payload)).Response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var (reused, reusedBody) = await Post("/api/v1/auth/forgot-password/reset", payload with { newPassword = "khac12345", confirmPassword = "khac12345" });
        reused.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        Code(reusedBody).Should().Be("invalid_reset_token");

        var (_, loginBody) = await Post("/api/v1/auth/login", new { login = user.Email, password = "matkhaumoi9" });
        var accessToken = loginBody.RootElement.GetProperty("data").GetProperty("accessToken").GetString();
        Code((await Post("/api/v1/auth/forgot-password/reset",
            new { resetToken = accessToken, newPassword = "khac12345", confirmPassword = "khac12345" })).Body).Should().Be("invalid_reset_token");

        var other = await _factory.CreateUserAsync(Password, role: UserRole.Customer);
        var expired = await ObtainResetToken(other.Email);
        _factory.Clock.Offset = TimeSpan.FromMinutes(10).Add(TimeSpan.FromSeconds(1));
        Code((await Post("/api/v1/auth/forgot-password/reset",
            new { resetToken = expired, newPassword = "khac12345", confirmPassword = "khac12345" })).Body).Should().Be("invalid_reset_token");
    }

    [Theory]
    [InlineData("abcdefgh", "abcdefgh")]
    [InlineData("12345678", "12345678")]
    [InlineData("abc1234", "abc1234")]
    [InlineData("matkhau123", "matkhau124")]
    public async Task WeakPasswordRejected(string password, string confirmPassword)
    {
        var (email, phone) = NewIdentity();

        var (response, body) = await Post("/api/v1/auth/register/request-otp",
            new { fullName = "Nguyễn Thị An", email, phoneNumber = phone, password, confirmPassword });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body.RootElement.GetProperty("errors").EnumerateArray()
            .Select(error => error.GetProperty("field").GetString())
            .Should().Contain(field => field == "Password" || field == "ConfirmPassword");
        _factory.Mail.Sent.Should().BeEmpty();
    }

    [Fact]
    public async Task MissingMailConfigStillStartsAndReturns503()
    {
        await using var factory = new AuthApiFactory(_postgres.ConnectionString, useRealMailSender: true);
        using var client = factory.CreateClient();
        var (email, phone) = NewIdentity();

        (await client.GetAsync("/health/live")).StatusCode.Should().Be(HttpStatusCode.OK);
        var (response, body) = await AuthApiFactory.PostAsync(client, "/api/v1/auth/register/request-otp",
            new { fullName = "Nguyễn Thị An", email, phoneNumber = phone, password = Password, confirmPassword = Password });

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        Code(body).Should().Be("email_send_failed");
        body.RootElement.ToString().Should().NotContain("MAIL_SETTINGS").And.NotContain("MailSettings");
    }

    private async Task<string> ObtainResetToken(string email)
    {
        (await Post("/api/v1/auth/forgot-password/request-otp", new { email })).Response.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var (verify, body) = await Post("/api/v1/auth/forgot-password/verify-otp", new { email, otp = _factory.Mail.LastOtpFor(email) });
        verify.StatusCode.Should().Be(HttpStatusCode.OK);
        return body.RootElement.GetProperty("data").GetProperty("resetToken").GetString()!;
    }

    private Task<(HttpResponseMessage Response, JsonDocument Body)> RequestRegistration(string email, string phone) =>
        Post("/api/v1/auth/register/request-otp",
            new { fullName = "Nguyễn Thị An", email, phoneNumber = phone, password = Password, confirmPassword = Password });

    private Task<(HttpResponseMessage Response, JsonDocument Body)> Verify(string email, string otp) =>
        Post("/api/v1/auth/register/verify-otp", new { email, otp });

    private Task<(HttpResponseMessage Response, JsonDocument Body)> Post(string path, object payload) =>
        AuthApiFactory.PostAsync(_client, path, payload);

    private async Task<bool> UserExists(string email)
    {
        await using var context = _postgres.CreateContext();
        return await context.Users.AnyAsync(row => row.Email == email);
    }

    private static (string Email, string Phone) NewIdentity() =>
        ($"kh-{Guid.NewGuid():N}@spa.test", "08" + Random.Shared.NextInt64(10_000_000, 99_999_999));

    private static string Code(JsonDocument body) => body.RootElement.GetProperty("errors")[0].GetProperty("code").GetString()!;
}
