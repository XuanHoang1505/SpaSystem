using System.Net;
using FluentAssertions;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Staff;

/// <summary>BR-STF-05: a resignation recorded for tomorrow blocks sign-in from tomorrow (STF-T09).</summary>
[Collection(PostgresCollection.Name)]
public sealed class StaffAuthTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private StaffApi _staff = null!;

    public StaffAuthTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CatalogApi(_factory, _postgres);
        _staff = new StaffApi(_factory, _postgres);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task FutureResignationBlocksLoginAndRefreshFromThatDay()
    {
        var owner = await _api.LoginAsync(UserRole.Owner);
        var user = await _factory.CreateUserAsync(CatalogApi.Password, role: UserRole.Staff);
        await using (var context = _postgres.CreateContext())
        {
            context.StaffMembers.Add(new Domain.Entities.StaffMember { Id = user.Id, HireDate = new DateOnly(2026, 1, 1) });
            await context.SaveChangesAsync();
        }
        var tomorrow = _staff.Today.AddDays(1);
        var (resign, _) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/staff/{user.Id}/resign", new { resignationDate = tomorrow.ToString("yyyy-MM-dd") }, owner);
        resign.StatusCode.Should().Be(HttpStatusCode.OK);

        var (today, todayBody) = await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/login", new { login = user.Email, password = CatalogApi.Password });
        today.StatusCode.Should().Be(HttpStatusCode.OK);
        var refreshToken = todayBody.RootElement.GetProperty("data").GetProperty("refreshToken").GetString();

        _factory.Clock.Offset = TimeSpan.FromDays(1);
        var (login, loginBody) = await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/login", new { login = user.Email, password = CatalogApi.Password });
        var (refresh, refreshBody) = await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/refresh", new { refreshToken });

        login.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        CatalogApi.ErrorCode(loginBody).Should().Be("account_inactive");
        refresh.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        CatalogApi.ErrorCode(refreshBody).Should().Be("account_inactive");
    }
}
