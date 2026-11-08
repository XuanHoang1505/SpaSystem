using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Catalog;

/// <summary>Service categories as a table (Q-13, CAT-T34, T38, T39) against PostgreSQL.</summary>
[Collection(PostgresCollection.Name)]
public sealed class ServiceCategoryEndpointsTests : IAsyncLifetime
{
    private const string Path = "/api/v1/service-categories";
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private string _owner = null!;

    public ServiceCategoryEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CatalogApi(_factory, _postgres);
        _owner = await _api.LoginAsync(UserRole.Owner);
    }

    public async Task DisposeAsync()
    {
        _api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task OwnerCreatesAndUpdatesACategory()
    {
        var tag = CatalogApi.NewTag();

        var (created, createdBody) = await _api.SendJsonAsync(HttpMethod.Post, Path, new { name = $"  Massage   {tag} ", sortOrder = 4 }, _owner);
        var id = CatalogApi.Data(createdBody).GetProperty("id").GetGuid();
        var (updated, updatedBody) = await _api.SendJsonAsync(
            HttpMethod.Put, $"{Path}/{id}", new { name = $"Massage body {tag}", description = "Thư giãn", sortOrder = 5, isActive = false }, _owner);

        created.StatusCode.Should().Be(HttpStatusCode.Created);
        created.Headers.Location!.ToString().Should().EndWith($"{Path}/{id}");
        CatalogApi.Data(createdBody).GetProperty("name").GetString().Should().Be($"Massage {tag}");
        CatalogApi.Data(createdBody).GetProperty("isActive").GetBoolean().Should().BeTrue();
        updated.StatusCode.Should().Be(HttpStatusCode.OK);
        await using var context = _postgres.CreateContext();
        var saved = await context.ServiceCategories.AsNoTracking().SingleAsync(row => row.Id == id);
        saved.Name.Should().Be($"Massage body {tag}");
        saved.Description.Should().Be("Thư giãn");
        saved.SortOrder.Should().Be(5);
        saved.IsActive.Should().BeFalse();
        saved.CreatedBy.Should().NotBeNull();
        CatalogApi.Data(updatedBody).GetProperty("serviceCount").GetInt32().Should().Be(0);
    }

    [Theory]
    [InlineData("", 0)]
    [InlineData("x101", 0)]
    [InlineData("ok", 1000)]
    [InlineData("ok", -1)]
    public async Task CreateRejectsInvalidFields(string name, int sortOrder)
    {
        var value = name == "x101" ? new string('a', 101) : name == "ok" ? $"{CatalogApi.NewTag()} hợp lệ" : name;

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, Path, new { name = value, sortOrder }, _owner);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(body).Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task DuplicateNamesIgnoringCaseAndAccentsAreRejected()
    {
        var tag = CatalogApi.NewTag();
        await _api.SeedCategoryAsync($"Chăm sóc da {tag}");
        var other = await _api.SeedCategoryAsync($"Massage {tag}");

        var (create, createBody) = await _api.SendJsonAsync(HttpMethod.Post, Path, new { name = $"CHAM SOC DA {tag}" }, _owner);
        var (rename, renameBody) = await _api.SendJsonAsync(
            HttpMethod.Put, $"{Path}/{other.Id}", new { name = $"cham soc da {tag}", sortOrder = 0, isActive = true }, _owner);

        create.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(createBody).Should().Be("service_category_exists");
        rename.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(renameBody).Should().Be("service_category_exists");
    }

    [Fact]
    public async Task ConcurrentDuplicateNameGives409()
    {
        var name = $"Đồng thời {CatalogApi.NewTag()}";

        var results = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ =>
            _api.SendJsonAsync(HttpMethod.Post, Path, new { name }, _owner)));

        results.Select(result => result.Response.StatusCode).Should()
            .BeEquivalentTo([HttpStatusCode.Created, HttpStatusCode.Conflict]);
        CatalogApi.ErrorCode(results.Single(result => result.Response.StatusCode == HttpStatusCode.Conflict).Body)
            .Should().Be("service_category_exists");
    }

    [Fact]
    public async Task DeleteOnlyRemovesAnEmptyCategory()
    {
        var tag = CatalogApi.NewTag();
        var empty = await _api.SeedCategoryAsync($"{tag} trống");
        await _api.SeedServiceAsync($"{tag} ngừng", category: $"{tag} dùng", status: CatalogStatus.Discontinued);
        var used = await _api.SeedCategoryAsync($"{tag} dùng");

        var (inUse, inUseBody) = await _api.SendAsync(HttpMethod.Delete, $"{Path}/{used.Id}", null, _owner);
        var (deleted, _) = await _api.SendAsync(HttpMethod.Delete, $"{Path}/{empty.Id}", null, _owner);
        var (missing, missingBody) = await _api.SendAsync(HttpMethod.Delete, $"{Path}/{Guid.NewGuid()}", null, _owner);

        inUse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(inUseBody).Should().Be("service_category_in_use");
        deleted.StatusCode.Should().Be(HttpStatusCode.NoContent);
        missing.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(missingBody).Should().Be("service_category_not_found");
        await using var context = _postgres.CreateContext();
        (await context.ServiceCategories.AnyAsync(row => row.Id == empty.Id)).Should().BeFalse();
    }

    [Theory]
    [InlineData(UserRole.Customer)]
    [InlineData(UserRole.Staff)]
    public async Task OnlyTheOwnerManagesCategories(UserRole role)
    {
        var bearer = await _api.LoginAsync(role);
        var category = await _api.SeedCategoryAsync($"{CatalogApi.NewTag()} quyền");

        var responses = new[]
        {
            (await _api.SendJsonAsync(HttpMethod.Post, Path, new { name = "x" }, bearer)).Response,
            (await _api.SendJsonAsync(HttpMethod.Put, $"{Path}/{category.Id}", new { name = "x", sortOrder = 0, isActive = true }, bearer)).Response,
            (await _api.SendAsync(HttpMethod.Delete, $"{Path}/{category.Id}", null, bearer)).Response,
        };
        var (anonymous, _) = await _api.SendJsonAsync(HttpMethod.Post, Path, new { name = "x" }, null);

        responses.Select(response => response.StatusCode).Should().AllBeEquivalentTo(HttpStatusCode.Forbidden);
        anonymous.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
