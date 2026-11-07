using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Staff;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Users;

/// <summary>UC-SPA-05 endpoints (docs/specs/auth.md AUTH-T35..T40) against PostgreSQL.</summary>
[Collection(PostgresCollection.Name)]
public sealed class UsersEndpointsTests : IAsyncLifetime
{
    private const string Password = CatalogApi.Password;
    private static readonly DateTime BaseTime = new(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc);

    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private StaffApi _staff = null!;
    private User _owner = null!;
    private string _ownerToken = null!;

    public UsersEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CatalogApi(_factory, _postgres);
        _staff = new StaffApi(_factory, _postgres);
        _owner = await _factory.CreateUserAsync(Password, role: UserRole.Owner);
        _ownerToken = await LoginAsync(_owner.Email);
    }

    public async Task DisposeAsync()
    {
        _api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private async Task<string> LoginAsync(string login) =>
        CatalogApi.Data((await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/login", new { login, password = Password })).Body)
            .GetProperty("accessToken").GetString()!;

    private async Task<User> SeedUserAsync(string name, UserRole role = UserRole.Customer, UserStatus status = UserStatus.Active, DateTime? createdAtUtc = null)
    {
        await using var context = _postgres.CreateContext();
        var user = new User
        {
            FullName = name,
            Email = $"user-{Guid.NewGuid():N}@spa.test",
            PhoneNumber = StaffApi.NewPhone(),
            PasswordHash = "x",
            Role = role,
            Status = status,
            CreatedAtUtc = createdAtUtc ?? BaseTime,
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user;
    }

    private static Guid[] Ids(JsonDocument body) =>
        CatalogApi.Data(body).GetProperty("items").EnumerateArray().Select(item => item.GetProperty("id").GetGuid()).ToArray();

    private Task<(HttpResponseMessage Response, JsonDocument Body)> PatchStatusAsync(Guid id, object payload) =>
        _api.SendJsonAsync(HttpMethod.Patch, $"/api/v1/users/{id}/status", payload, _ownerToken);

    [Fact]
    public async Task OwnerSearchesAndFiltersAccounts()
    {
        var tag = CatalogApi.NewTag();
        var customer = await SeedUserAsync($"Nguyễn Văn {tag}", createdAtUtc: BaseTime);
        var locked = await SeedUserAsync($"Nguyễn Văn {tag} khóa", status: UserStatus.Locked, createdAtUtc: BaseTime.AddDays(1));
        var staff = await SeedUserAsync($"Nguyễn Văn {tag} nhân viên", UserRole.Staff, createdAtUtc: BaseTime.AddDays(2));

        var (all, allBody) = await _api.GetAsync($"/api/v1/users?search=nguyen van {tag}", _ownerToken);
        all.StatusCode.Should().Be(HttpStatusCode.OK);
        Ids(allBody).Should().Equal(staff.Id, locked.Id, customer.Id);
        var first = CatalogApi.Data(allBody).GetProperty("items")[0];
        first.GetProperty("role").GetString().Should().Be("staff");
        first.GetProperty("email").GetString().Should().Be(staff.Email);

        Ids((await _api.GetAsync($"/api/v1/users?search={customer.Email.ToUpperInvariant()}", _ownerToken)).Body).Should().Equal(customer.Id);
        Ids((await _api.GetAsync($"/api/v1/users?search={customer.PhoneNumber[1..9]}", _ownerToken)).Body).Should().Contain(customer.Id);
        Ids((await _api.GetAsync($"/api/v1/users?search={tag}&role=staff", _ownerToken)).Body).Should().Equal(staff.Id);
        Ids((await _api.GetAsync($"/api/v1/users?search={tag}&status=locked", _ownerToken)).Body).Should().Equal(locked.Id);

        var (page, pageBody) = await _api.GetAsync($"/api/v1/users?search={tag}&pageSize=1&pageNumber=2", _ownerToken);
        page.StatusCode.Should().Be(HttpStatusCode.OK);
        Ids(pageBody).Should().Equal(locked.Id);
        CatalogApi.Data(pageBody).GetProperty("totalCount").GetInt32().Should().Be(3);

        (await _api.GetAsync("/api/v1/users?role=x", _ownerToken)).Response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DetailShowsStaffDatesForStaffOnly()
    {
        var staff = await _staff.SeedStaffAsync("Nhân viên đã nghỉ", new DateOnly(2026, 1, 1), UserStatus.Inactive);
        await using (var context = _postgres.CreateContext())
        {
            var row = await context.StaffMembers.SingleAsync(item => item.Id == staff.Id);
            row.Resign(new DateOnly(2026, 6, 30));
            await context.SaveChangesAsync();
        }
        var customer = await SeedUserAsync("Khách hàng");

        var (staffResponse, staffBody) = await _api.GetAsync($"/api/v1/users/{staff.Id}", _ownerToken);
        var (_, customerBody) = await _api.GetAsync($"/api/v1/users/{customer.Id}", _ownerToken);
        var (missing, missingBody) = await _api.GetAsync($"/api/v1/users/{Guid.NewGuid()}", _ownerToken);

        staffResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var staffData = CatalogApi.Data(staffBody);
        staffData.GetProperty("status").GetString().Should().Be("inactive");
        staffData.GetProperty("staff").GetProperty("resignationDate").GetString().Should().Be("2026-06-30");
        CatalogApi.Data(customerBody).GetProperty("staff").ValueKind.Should().Be(JsonValueKind.Null);
        missing.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(missingBody).Should().Be("user_not_found");
    }

    [Fact]
    public async Task OwnerEditsAccount()
    {
        var customer = await SeedUserAsync("Khách hàng");
        var other = await SeedUserAsync("Khách khác");
        var phone = StaffApi.NewPhone();

        var (ok, okBody) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/users/{customer.Id}",
            new { fullName = "Khách đã sửa", phoneNumber = phone, dateOfBirth = "1990-01-02", gender = "male" }, _ownerToken);
        var (taken, takenBody) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/users/{customer.Id}",
            new { fullName = "Khách", phoneNumber = other.PhoneNumber, dateOfBirth = (string?)null, gender = (string?)null }, _ownerToken);

        ok.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(okBody);
        data.GetProperty("fullName").GetString().Should().Be("Khách đã sửa");
        data.GetProperty("phoneNumber").GetString().Should().Be(phone);
        data.GetProperty("gender").GetString().Should().Be("male");
        data.GetProperty("email").GetString().Should().Be(customer.Email);
        taken.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(takenBody).Should().Be("phone_exists");
    }

    [Fact]
    public async Task LockEndsSessionsAndUnlockRestoresSignIn()
    {
        var customer = await _factory.CreateUserAsync(Password, role: UserRole.Customer);
        var (_, login) = await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/login", new { login = customer.Email, password = Password });
        var refreshToken = CatalogApi.Data(login).GetProperty("refreshToken").GetString();

        (await PatchStatusAsync(customer.Id, new { status = "locked" })).Response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/refresh", new { refreshToken })).Response.StatusCode
            .Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
        var (lockedLogin, lockedBody) = await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/login", new { login = customer.Email, password = Password });
        lockedLogin.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        CatalogApi.ErrorCode(lockedBody).Should().Be("account_locked");

        (await PatchStatusAsync(customer.Id, new { status = "active" })).Response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/login", new { login = customer.Email, password = Password })).Response.StatusCode
            .Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task StatusChangeRules()
    {
        var resigned = await _staff.SeedStaffAsync("Nhân viên nghỉ", status: UserStatus.Inactive);
        var locked = await SeedUserAsync("Đã khóa", status: UserStatus.Locked);
        var customer = await SeedUserAsync("Khách");

        var (self, selfBody) = await PatchStatusAsync(_owner.Id, new { status = "locked" });
        self.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(selfBody).Should().Be("cannot_lock_self");

        var (inactive, inactiveBody) = await PatchStatusAsync(resigned.Id, new { status = "locked" });
        inactive.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(inactiveBody).Should().Be("account_inactive");

        (await PatchStatusAsync(locked.Id, new { status = "locked" })).Response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await PatchStatusAsync(customer.Id, new { status = "inactive" })).Response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await PatchStatusAsync(customer.Id, new { })).Response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await PatchStatusAsync(Guid.NewGuid(), new { status = "locked" })).Response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        await using var context = _postgres.CreateContext();
        (await context.Users.SingleAsync(row => row.Id == customer.Id)).Status.Should().Be(UserStatus.Active);
    }

    [Theory]
    [InlineData(UserRole.Customer)]
    [InlineData(UserRole.Staff)]
    public async Task OtherRolesAreForbidden(UserRole role)
    {
        var user = await _factory.CreateUserAsync(Password, role: role);
        var token = await LoginAsync(user.Email);

        var (response, body) = await _api.GetAsync("/api/v1/users", token);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        CatalogApi.ErrorCode(body).Should().Be("forbidden");
        (await _api.SendJsonAsync(HttpMethod.Patch, $"/api/v1/users/{_owner.Id}/status", new { status = "locked" }, token)).Response.StatusCode
            .Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AnonymousCallerIsUnauthorized()
    {
        var (response, body) = await _api.GetAsync("/api/v1/users");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        CatalogApi.ErrorCode(body).Should().Be("unauthorized");
    }
}
