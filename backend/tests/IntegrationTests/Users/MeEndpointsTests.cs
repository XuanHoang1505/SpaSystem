using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Staff;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Users;

/// <summary>UC-SPA-04 endpoints (docs/specs/auth.md AUTH-T25..T34) against PostgreSQL.</summary>
[Collection(PostgresCollection.Name)]
public sealed class MeEndpointsTests : IAsyncLifetime
{
    private const string Password = CatalogApi.Password;
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1];

    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;

    public MeEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CatalogApi(_factory, _postgres);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private async Task<(User User, string AccessToken, string RefreshToken)> SignInAsync(UserRole role = UserRole.Customer)
    {
        var user = await _factory.CreateUserAsync(Password, role: role);
        var (response, body) = await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/login", new { login = user.Email, password = Password });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        return (user, data.GetProperty("accessToken").GetString()!, data.GetProperty("refreshToken").GetString()!);
    }

    private async Task<HttpStatusCode> LoginStatusAsync(string login, string password) =>
        (await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/login", new { login, password })).Response.StatusCode;

    private async Task<HttpStatusCode> RefreshStatusAsync(string refreshToken) =>
        (await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/refresh", new { refreshToken })).Response.StatusCode;

    private static object Profile(string fullName, string phoneNumber, string? dateOfBirth = null, string? gender = null) =>
        new { fullName, phoneNumber, dateOfBirth, gender };

    private static string[] Fields(JsonDocument body) =>
        body.RootElement.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("field").GetString()!).ToArray();

    [Theory]
    [InlineData(UserRole.Customer, "customer")]
    [InlineData(UserRole.Staff, "staff")]
    [InlineData(UserRole.Owner, "owner")]
    public async Task EveryRoleReadsOwnAccount(UserRole role, string roleName)
    {
        var (user, token, _) = await SignInAsync(role);

        var (response, body) = await _api.GetAsync("/api/v1/me", token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("id").GetGuid().Should().Be(user.Id);
        data.GetProperty("email").GetString().Should().Be(user.Email);
        data.GetProperty("role").GetString().Should().Be(roleName);
        data.GetProperty("status").GetString().Should().Be("active");
        body.RootElement.GetRawText().Should().NotContainEquivalentOf("password");
    }

    [Fact]
    public async Task UpdateTrimsFieldsAndNewPhoneSignsIn()
    {
        var (user, token, _) = await SignInAsync();
        var phone = StaffApi.NewPhone();

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Put, "/api/v1/me", Profile("  Trần Thị B  ", $" {phone} ", "1995-05-20", null), token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("fullName").GetString().Should().Be("Trần Thị B");
        data.GetProperty("phoneNumber").GetString().Should().Be(phone);
        data.GetProperty("dateOfBirth").GetString().Should().Be("1995-05-20");
        data.GetProperty("gender").ValueKind.Should().Be(JsonValueKind.Null);
        (await LoginStatusAsync(phone, Password)).Should().Be(HttpStatusCode.OK);
        (await LoginStatusAsync(user.PhoneNumber, Password)).Should().Be(HttpStatusCode.Unauthorized);
        await using var context = _postgres.CreateContext();
        (await context.Users.SingleAsync(row => row.Id == user.Id)).UpdatedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateIgnoresEmailRoleAndStatus()
    {
        var (user, token, _) = await SignInAsync();

        var (response, _) = await _api.SendJsonAsync(HttpMethod.Put, "/api/v1/me",
            new { fullName = "Khách", phoneNumber = user.PhoneNumber, email = "khac@spa.test", role = "owner", status = "locked" }, token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        await using var context = _postgres.CreateContext();
        var stored = await context.Users.SingleAsync(row => row.Id == user.Id);
        stored.Email.Should().Be(user.Email);
        stored.Role.Should().Be(UserRole.Customer);
        stored.Status.Should().Be(UserStatus.Active);
    }

    [Fact]
    public async Task PhoneOfAnotherAccountConflictsButOwnPhoneIsFine()
    {
        var other = await _factory.CreateUserAsync(Password, role: UserRole.Customer);
        var (user, token, _) = await SignInAsync();

        var (taken, body) = await _api.SendJsonAsync(HttpMethod.Put, "/api/v1/me", Profile("Khách", other.PhoneNumber), token);
        var (own, _) = await _api.SendJsonAsync(HttpMethod.Put, "/api/v1/me", Profile("Khách", user.PhoneNumber, gender: "female"), token);

        taken.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(body).Should().Be("phone_exists");
        own.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task InvalidProfileIsRejectedPerField()
    {
        var (user, token, _) = await SignInAsync();
        var tomorrow = SpaTime.Today(_factory.Clock.UtcNow).AddDays(1).ToString("yyyy-MM-dd");

        foreach (var (payload, field) in new (object, string)[]
                 {
                     (Profile("", user.PhoneNumber), "FullName"),
                     (Profile(new string('a', 101), user.PhoneNumber), "FullName"),
                     (Profile("Khách", "12345"), "PhoneNumber"),
                     (Profile("Khách", user.PhoneNumber, tomorrow), "DateOfBirth"),
                     (Profile("Khách", user.PhoneNumber, "1899-12-31"), "DateOfBirth"),
                 })
        {
            var (response, body) = await _api.SendJsonAsync(HttpMethod.Put, "/api/v1/me", payload, token);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            body.RootElement.GetProperty("message").GetString().Should().Be("Validation failed.");
            Fields(body).Should().Contain(field);
        }

        var (badGender, _) = await _api.SendJsonAsync(HttpMethod.Put, "/api/v1/me", Profile("Khách", user.PhoneNumber, gender: "x"), token);
        badGender.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ChangePasswordEndsEverySession()
    {
        var (user, token, refreshToken) = await SignInAsync();

        var (response, _) = await _api.SendJsonAsync(HttpMethod.Put, "/api/v1/me/password",
            new { currentPassword = Password, newPassword = "matkhaumoi9", confirmPassword = "matkhaumoi9" }, token);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await LoginStatusAsync(user.Email, "matkhaumoi9")).Should().Be(HttpStatusCode.OK);
        (await LoginStatusAsync(user.Email, Password)).Should().Be(HttpStatusCode.Unauthorized);
        (await RefreshStatusAsync(refreshToken)).Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task WrongCurrentPasswordKeepsSessions()
    {
        var (_, token, refreshToken) = await SignInAsync();

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Put, "/api/v1/me/password",
            new { currentPassword = "saimatkhau1", newPassword = "matkhaumoi9", confirmPassword = "matkhaumoi9" }, token);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(body).Should().Be("current_password_incorrect");
        (await RefreshStatusAsync(refreshToken)).Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task InvalidNewPasswordIsRejected()
    {
        var (_, token, _) = await SignInAsync();

        foreach (var (next, confirm) in new[] { ("abcdefgh", "abcdefgh"), ("matkhaumoi9", "matkhaukhac9") })
        {
            var (response, _) = await _api.SendJsonAsync(HttpMethod.Put, "/api/v1/me/password",
                new { currentPassword = Password, newPassword = next, confirmPassword = confirm }, token);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        var (same, body) = await _api.SendJsonAsync(HttpMethod.Put, "/api/v1/me/password",
            new { currentPassword = Password, newPassword = Password, confirmPassword = Password }, token);
        same.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(body).Should().Be("password_unchanged");
    }

    [Fact]
    public async Task AvatarCanBeUploadedAndDeleted()
    {
        var (user, token, _) = await SignInAsync();

        var (upload, body) = await _api.SendAsync(HttpMethod.Post, "/api/v1/me/avatar", CatalogApi.ImageForm(Jpeg), token);

        upload.StatusCode.Should().Be(HttpStatusCode.OK);
        var url = CatalogApi.Data(body).GetProperty("avatarUrl").GetString();
        url.Should().StartWith($"https://res.cloudinary.test/avatars/{user.Id}");
        _factory.Files.Uploads.Should().ContainSingle(item => item.PublicId == $"avatars/{user.Id}" && item.ContentType == "image/jpeg");
        CatalogApi.Data((await _api.GetAsync("/api/v1/me", token)).Body).GetProperty("avatarUrl").GetString().Should().Be(url);

        (await _api.SendAsync(HttpMethod.Delete, "/api/v1/me/avatar", null, token)).Response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        CatalogApi.Data((await _api.GetAsync("/api/v1/me", token)).Body).GetProperty("avatarUrl").ValueKind.Should().Be(JsonValueKind.Null);
        (await _api.SendAsync(HttpMethod.Delete, "/api/v1/me/avatar", null, token)).Response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        _factory.Files.Deletes.Should().Equal($"avatars/{user.Id}");
    }

    [Fact]
    public async Task InvalidAvatarIsRejected()
    {
        var (_, token, _) = await SignInAsync();

        var (missing, missingBody) = await _api.SendAsync(HttpMethod.Post, "/api/v1/me/avatar", CatalogApi.ImageForm(Jpeg, field: "photo"), token);
        var (empty, emptyBody) = await _api.SendAsync(HttpMethod.Post, "/api/v1/me/avatar", CatalogApi.ImageForm([]), token);
        var (tooLarge, tooLargeBody) = await _api.SendAsync(HttpMethod.Post, "/api/v1/me/avatar",
            CatalogApi.ImageForm([.. Jpeg, .. new byte[5 * 1024 * 1024]]), token);
        var (text, textBody) = await _api.SendAsync(HttpMethod.Post, "/api/v1/me/avatar",
            CatalogApi.ImageForm("khong phai anh, chi la chu"u8.ToArray(), "anh.png", "image/png"), token);

        missing.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(missingBody).Should().Be("image_required");
        empty.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(emptyBody).Should().Be("image_required");
        tooLarge.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(tooLargeBody).Should().Be("image_too_large");
        text.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(textBody).Should().Be("image_type_not_supported");
    }

    [Fact]
    public async Task StorageOutageKeepsCurrentAvatar()
    {
        var (user, token, _) = await SignInAsync();
        await _api.SendAsync(HttpMethod.Post, "/api/v1/me/avatar", CatalogApi.ImageForm(Jpeg), token);
        _factory.Files.Fail = true;

        var (response, _) = await _api.SendAsync(HttpMethod.Post, "/api/v1/me/avatar", CatalogApi.ImageForm(Jpeg), token);

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        await using var context = _postgres.CreateContext();
        (await context.Users.SingleAsync(row => row.Id == user.Id)).AvatarUrl.Should().EndWith("?v=1");
    }

    [Theory]
    [InlineData("GET", "/api/v1/me")]
    [InlineData("PUT", "/api/v1/me")]
    [InlineData("PUT", "/api/v1/me/password")]
    [InlineData("POST", "/api/v1/me/avatar")]
    [InlineData("DELETE", "/api/v1/me/avatar")]
    public async Task AnonymousCallerIsUnauthorized(string method, string path)
    {
        // The avatar upload is multipart: a JSON body would be refused with 415 before authentication runs.
        HttpContent content = path.EndsWith("/avatar", StringComparison.Ordinal) && method == "POST" ? CatalogApi.ImageForm(Jpeg) : JsonContent.Create(new { });
        var (response, body) = await _api.SendAsync(new HttpMethod(method), path, content, null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        CatalogApi.ErrorCode(body).Should().Be("unauthorized");
    }
}
