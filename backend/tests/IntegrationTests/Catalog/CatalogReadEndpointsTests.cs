using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Catalog;

/// <summary>UC-SPA-06/07 reads (docs/specs/catalog.md CAT-T01..T12) against PostgreSQL.</summary>
[Collection(PostgresCollection.Name)]
public sealed class CatalogReadEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;

    public CatalogReadEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

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

    [Fact]
    public async Task GuestSeesOnlyOnSaleServicesAndStatusFilterIsIgnored()
    {
        var tag = CatalogApi.NewTag();
        await _api.SeedServiceAsync($"{tag} đang bán");
        await _api.SeedServiceAsync($"{tag} ngừng bán", status: CatalogStatus.Discontinued);
        var customer = await _api.LoginAsync(UserRole.Customer);

        var (guest, guestBody) = await _api.GetAsync($"/api/v1/services?search={tag}&status=discontinued");
        var (_, customerBody) = await _api.GetAsync($"/api/v1/services?search={tag}", customer);

        guest.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Names(guestBody).Should().Equal($"{tag} đang bán");
        CatalogApi.Names(customerBody).Should().Equal($"{tag} đang bán");
        var row = CatalogApi.Data(guestBody).GetProperty("items")[0];
        row.GetProperty("status").GetString().Should().Be("on_sale");
        row.GetProperty("durationMinutes").GetInt32().Should().Be(60);
    }

    [Fact]
    public async Task OwnerSeesEveryServiceAndCanFilterByStatus()
    {
        var tag = CatalogApi.NewTag();
        await _api.SeedServiceAsync($"{tag} a đang bán");
        await _api.SeedServiceAsync($"{tag} b ngừng bán", status: CatalogStatus.Discontinued);
        var owner = await _api.LoginAsync(UserRole.Owner);

        var (_, all) = await _api.GetAsync($"/api/v1/services?search={tag}", owner);
        var (_, discontinued) = await _api.GetAsync($"/api/v1/services?search={tag}&status=discontinued", owner);
        var (invalid, invalidBody) = await _api.GetAsync($"/api/v1/services?search={tag}&status=hidden", owner);

        CatalogApi.Names(all).Should().HaveCount(2);
        CatalogApi.Names(discontinued).Should().Equal($"{tag} b ngừng bán");
        invalid.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(invalidBody).Should().Be("validation_error");
    }

    [Fact]
    public async Task GuestSeesPackagesOnlyInsideTheirSaleWindow()
    {
        var tag = CatalogApi.NewTag();
        var service = await _api.SeedServiceAsync($"{tag} dịch vụ");
        var today = SpaTime.Today(_factory.Clock.UtcNow);
        await _api.SeedPackageAsync($"{tag} 1 luôn bán", [service]);
        await _api.SeedPackageAsync($"{tag} 2 đúng hôm nay", [service], saleStart: today, saleEnd: today);
        await _api.SeedPackageAsync($"{tag} 3 chưa mở", [service], saleStart: today.AddDays(1));
        await _api.SeedPackageAsync($"{tag} 4 đã hết", [service], saleEnd: today.AddDays(-1));
        await _api.SeedPackageAsync($"{tag} 5 ngừng bán", [service], status: CatalogStatus.Discontinued);
        var owner = await _api.LoginAsync(UserRole.Owner);

        var (_, guest) = await _api.GetAsync($"/api/v1/packages?search={tag}");
        var (_, ownerBody) = await _api.GetAsync($"/api/v1/packages?search={tag}", owner);

        CatalogApi.Names(guest).Should().Equal($"{tag} 1 luôn bán", $"{tag} 2 đúng hôm nay");
        CatalogApi.Names(ownerBody).Should().HaveCount(5);
    }

    [Fact]
    public async Task ShortDescriptionsAndStepsAreReturned()
    {
        var tag = CatalogApi.NewTag();
        var service = await _api.SeedServiceAsync($"{tag} có quy trình");
        var package = await _api.SeedPackageAsync($"{tag} gói", [service]);
        await using (var context = _postgres.CreateContext())
        {
            await context.SpaServices.Where(row => row.Id == service.Id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.ShortDescription, "Ngắn dịch vụ"));
            await context.ServicePackages.Where(row => row.Id == package.Id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.ShortDescription, "Ngắn gói"));
            context.ServiceSteps.AddRange(
                new ServiceStep { SpaServiceId = service.Id, SortOrder = 2, Title = "Hai", DurationMinutes = 15 },
                new ServiceStep { SpaServiceId = service.Id, SortOrder = 1, Title = "Một" });
            await context.SaveChangesAsync();
        }

        var (_, list) = await _api.GetAsync($"/api/v1/services?search={tag}");
        var (_, detail) = await _api.GetAsync($"/api/v1/services/{service.Id}");
        var (_, packages) = await _api.GetAsync($"/api/v1/packages?search={tag}");
        var (_, packageDetail) = await _api.GetAsync($"/api/v1/packages/{package.Id}");

        CatalogApi.Data(list).GetProperty("items")[0].GetProperty("shortDescription").GetString().Should().Be("Ngắn dịch vụ");
        var data = CatalogApi.Data(detail);
        data.GetProperty("shortDescription").GetString().Should().Be("Ngắn dịch vụ");
        data.GetProperty("steps").EnumerateArray().Select(step => step.GetProperty("title").GetString()).Should().Equal("Một", "Hai");
        data.GetProperty("steps")[1].GetProperty("durationMinutes").GetInt32().Should().Be(15);
        CatalogApi.Data(packages).GetProperty("items")[0].GetProperty("shortDescription").GetString().Should().Be("Ngắn gói");
        CatalogApi.Data(packageDetail).GetProperty("shortDescription").GetString().Should().Be("Ngắn gói");
    }

    [Fact]
    public async Task PackagesCanBeFilteredByServiceAndCarryTheirRetailPrice()
    {
        var tag = CatalogApi.NewTag();
        var facial = await _api.SeedServiceAsync($"{tag} da mặt", price: 300_000);
        var massage = await _api.SeedServiceAsync($"{tag} massage", price: 200_000);
        // SeedPackageAsync gives item i (0-based) i + 1 sessions: facial × 1 + massage × 2 = 700 000.
        var both = await _api.SeedPackageAsync($"{tag} gói đủ", [facial, massage], price: 500_000);
        await _api.SeedPackageAsync($"{tag} gói massage", [massage], price: 150_000);

        var (_, withFacial) = await _api.GetAsync($"/api/v1/packages?serviceId={facial.Id}&pageSize=100");
        var (_, detail) = await _api.GetAsync($"/api/v1/packages/{both.Id}");
        var (badId, _) = await _api.GetAsync("/api/v1/packages?serviceId=abc");

        CatalogApi.Names(withFacial).Should().Equal($"{tag} gói đủ");
        CatalogApi.Data(withFacial).GetProperty("items")[0].GetProperty("retailPrice").GetDecimal().Should().Be(700_000);
        var data = CatalogApi.Data(detail);
        data.GetProperty("retailPrice").GetDecimal().Should().Be(700_000);
        data.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("servicePrice").GetDecimal())
            .Should().Equal(300_000m, 200_000m);
        badId.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SearchIgnoresCaseAndVietnameseDiacriticsAndTreatsWildcardsLiterally()
    {
        var tag = CatalogApi.NewTag();
        await _api.SeedServiceAsync($"{tag} Chăm sóc da mặt");
        await _api.SeedServiceAsync($"{tag} Đắp mặt nạ dầu dừa", category: "Đặc trị");

        (await Names($"{tag} cham soc da")).Should().Equal($"{tag} Chăm sóc da mặt");
        (await Names($"{tag.ToUpperInvariant()} CHĂM")).Should().Equal($"{tag} Chăm sóc da mặt");
        (await Names($"{tag} dap mat na dau")).Should().Equal($"{tag} Đắp mặt nạ dầu dừa");
        (await Names("dac tri")).Should().Contain($"{tag} Đắp mặt nạ dầu dừa", "search also matches the category");
        (await Names($"{tag}%")).Should().BeEmpty();
        (await Names($"{tag[..4]}_")).Should().BeEmpty();

        async Task<string[]> Names(string search) =>
            CatalogApi.Names((await _api.GetAsync($"/api/v1/services?pageSize=100&search={Uri.EscapeDataString(search)}")).Body);
    }

    [Fact]
    public async Task ServiceListFiltersSortsAndPages()
    {
        var tag = CatalogApi.NewTag();
        var category = $"Loại {tag} Đặc biệt";
        foreach (var price in new[] { 100_000m, 200_000m, 300_000m, 400_000m, 500_000m })
            await _api.SeedServiceAsync($"{tag} giá {price}", category: category, price: price);
        await _api.SeedServiceAsync($"{tag} loại khác", category: "Khác", price: 250_000);
        var categoryQuery = (await _api.SeedCategoryAsync(category)).Id;

        var (_, byCategory) = await _api.GetAsync($"/api/v1/services?search={tag}&categoryId={categoryQuery}&pageSize=100");
        var (_, byPrice) = await _api.GetAsync($"/api/v1/services?search={tag}&minPrice=200000&maxPrice=400000&pageSize=100");
        var (_, page) = await _api.GetAsync($"/api/v1/services?search={tag}&categoryId={categoryQuery}&sortBy=price&sortDirection=desc&pageNumber=2&pageSize=2");
        var (badRange, badRangeBody) = await _api.GetAsync("/api/v1/services?minPrice=500&maxPrice=100");
        var (negative, _) = await _api.GetAsync("/api/v1/services?minPrice=-1");
        var (badSort, badSortBody) = await _api.GetAsync("/api/v1/services?sortBy=rating");
        var (badCategory, _) = await _api.GetAsync("/api/v1/services?categoryId=abc");

        CatalogApi.Names(byCategory).Should().HaveCount(5);
        CatalogApi.Names(byPrice).Should().HaveCount(4, "200k, 250k, 300k and 400k");
        CatalogApi.Names(page).Should().Equal($"{tag} giá 300000", $"{tag} giá 200000");
        var data = CatalogApi.Data(page);
        data.GetProperty("totalCount").GetInt32().Should().Be(5);
        data.GetProperty("totalPages").GetInt32().Should().Be(3);
        data.GetProperty("pageNumber").GetInt32().Should().Be(2);
        badRange.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        badRangeBody.RootElement.GetProperty("errors")[0].GetProperty("field").GetString().Should().Be("MaxPrice");
        negative.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        badSort.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        badCategory.StatusCode.Should().Be(HttpStatusCode.BadRequest, "categoryId must be a GUID (CAT-T36)");
        CatalogApi.Data(badSortBody).ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
    }

    [Fact]
    public async Task CategoriesListHidesHiddenAndEmptyCategoriesFromGuests()
    {
        var tag = CatalogApi.NewTag();
        await _api.SeedCategoryAsync($"{tag} B bán", sortOrder: 2);
        await _api.SeedCategoryAsync($"{tag} A bán", sortOrder: 2);
        await _api.SeedCategoryAsync($"{tag} Đầu", sortOrder: 1);
        await _api.SeedServiceAsync($"{tag} a", category: $"{tag} B bán");
        await _api.SeedServiceAsync($"{tag} b", category: $"{tag} B bán");
        await _api.SeedServiceAsync($"{tag} b2", category: $"{tag} B bán", status: CatalogStatus.Discontinued);
        await _api.SeedServiceAsync($"{tag} c", category: $"{tag} A bán");
        await _api.SeedServiceAsync($"{tag} d", category: $"{tag} Đầu");
        await _api.SeedCategoryAsync($"{tag} Ngừng", sortOrder: 0);
        await _api.SeedServiceAsync($"{tag} e", category: $"{tag} Ngừng", status: CatalogStatus.Discontinued);
        await _api.SeedCategoryAsync($"{tag} Ẩn", isActive: false, sortOrder: 3);
        var hiddenService = await _api.SeedServiceAsync($"{tag} f vẫn bán", category: $"{tag} Ẩn");
        var owner = await _api.LoginAsync(UserRole.Owner);

        var (_, guest) = await _api.GetAsync("/api/v1/service-categories");
        var (_, ownerBody) = await _api.GetAsync("/api/v1/service-categories", owner);
        var (detail, _) = await _api.GetAsync($"/api/v1/services/{hiddenService.Id}");
        var (_, search) = await _api.GetAsync($"/api/v1/services?search={Uri.EscapeDataString(tag + " f")}");

        Categories(guest).Should().Equal(($"{tag} Đầu", 1), ($"{tag} A bán", 1), ($"{tag} B bán", 2));
        Categories(ownerBody).Should().Equal(
            ($"{tag} Ngừng", 1), ($"{tag} Đầu", 1), ($"{tag} A bán", 1), ($"{tag} B bán", 3), ($"{tag} Ẩn", 1));
        detail.StatusCode.Should().Be(HttpStatusCode.OK, "a hidden category only leaves the filter (CAT-T40)");
        CatalogApi.Names(search).Should().Contain($"{tag} f vẫn bán");

        (string Name, int Count)[] Categories(System.Text.Json.JsonDocument body) => CatalogApi.Data(body).EnumerateArray()
            .Select(item => (item.GetProperty("name").GetString()!, item.GetProperty("serviceCount").GetInt32()))
            .Where(item => item.Item1.StartsWith(tag, StringComparison.Ordinal)).ToArray();
    }

    [Fact]
    public async Task SuggestionsMixServicesAndPackagesWithPrefixMatchesFirst()
    {
        var tag = CatalogApi.NewTag();
        var service = await _api.SeedServiceAsync($"{tag} gốc");
        foreach (var name in new[] { "Massage", "Xông hơi", "Gội đầu", "Tẩy da" })
            await _api.SeedServiceAsync($"{name} {tag}");
        await _api.SeedServiceAsync($"{tag} ẩn", status: CatalogStatus.Discontinued);
        await _api.SeedPackageAsync($"{tag} gói đầu", [service]);
        foreach (var name in new[] { "Gói A", "Gói B", "Gói C", "Gói D" })
            await _api.SeedPackageAsync($"{name} {tag}", [service]);

        var (response, body) = await _api.GetAsync($"/api/v1/catalog/suggestions?search={tag}");
        var (tooShort, _) = await _api.GetAsync("/api/v1/catalog/suggestions?search=c");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var items = CatalogApi.Data(body).EnumerateArray().ToArray();
        items.Should().HaveCount(8);
        items.Take(2).Select(item => item.GetProperty("name").GetString()).Should().BeEquivalentTo([$"{tag} gốc", $"{tag} gói đầu"]);
        items.Select(item => item.GetProperty("type").GetString()).Should().Contain(["service", "package"]);
        items.Select(item => item.GetProperty("name").GetString()).Should().NotContain($"{tag} ẩn");
        tooShort.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DetailHidesDiscontinuedAndOutOfWindowItemsFromGuestsWithOneMessage()
    {
        var tag = CatalogApi.NewTag();
        var hidden = await _api.SeedServiceAsync($"{tag} ngừng", status: CatalogStatus.Discontinued);
        var expired = await _api.SeedPackageAsync($"{tag} hết hạn", [hidden], saleEnd: SpaTime.Today(_factory.Clock.UtcNow).AddDays(-1));
        var owner = await _api.LoginAsync(UserRole.Owner);

        var (hiddenService, hiddenBody) = await _api.GetAsync($"/api/v1/services/{hidden.Id}");
        var (missingService, missingBody) = await _api.GetAsync($"/api/v1/services/{Guid.NewGuid()}");
        var (hiddenPackage, hiddenPackageBody) = await _api.GetAsync($"/api/v1/packages/{expired.Id}");
        var (ownerService, _) = await _api.GetAsync($"/api/v1/services/{hidden.Id}", owner);
        var (ownerPackage, _) = await _api.GetAsync($"/api/v1/packages/{expired.Id}", owner);
        var (notGuid, _) = await _api.GetAsync("/api/v1/services/abc");

        hiddenService.StatusCode.Should().Be(HttpStatusCode.NotFound);
        missingService.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(hiddenBody).Should().Be("service_not_found");
        hiddenBody.RootElement.GetProperty("message").GetString().Should().Be(missingBody.RootElement.GetProperty("message").GetString());
        hiddenPackage.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(hiddenPackageBody).Should().Be("package_not_found");
        ownerService.StatusCode.Should().Be(HttpStatusCode.OK);
        ownerPackage.StatusCode.Should().Be(HttpStatusCode.OK);
        notGuid.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PackageDetailOrdersItemsAndFallsBackToFirstServiceImage()
    {
        var tag = CatalogApi.NewTag();
        var noImage = await _api.SeedServiceAsync($"{tag} không ảnh");
        var withImage = await _api.SeedServiceAsync($"{tag} có ảnh", imageUrl: "https://img.test/dich-vu.jpg");
        var third = await _api.SeedServiceAsync($"{tag} thứ ba", imageUrl: "https://img.test/thu-ba.jpg");
        var fallback = await _api.SeedPackageAsync($"{tag} dự phòng", [third, noImage, withImage], sortOrders: [3, 1, 2]);
        var own = await _api.SeedPackageAsync($"{tag} có ảnh riêng", [withImage], imageUrl: "https://img.test/goi.jpg");
        var none = await _api.SeedPackageAsync($"{tag} không có ảnh", [noImage]);

        var (_, detail) = await _api.GetAsync($"/api/v1/packages/{fallback.Id}");
        var (_, list) = await _api.GetAsync($"/api/v1/packages?search={tag}");

        var data = CatalogApi.Data(detail);
        data.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("sortOrder").GetInt32()).Should().Equal(1, 2, 3);
        data.GetProperty("items")[0].GetProperty("serviceName").GetString().Should().Be($"{tag} không ảnh");
        data.GetProperty("totalSessions").GetInt32().Should().Be(6);
        data.GetProperty("imageUrl").GetString().Should().Be("https://img.test/dich-vu.jpg");
        var images = CatalogApi.Data(list).GetProperty("items").EnumerateArray()
            .ToDictionary(item => item.GetProperty("id").GetGuid(), item => item.GetProperty("imageUrl").GetString());
        images[fallback.Id].Should().Be("https://img.test/dich-vu.jpg");
        images[own.Id].Should().Be("https://img.test/goi.jpg");
        images[none.Id].Should().BeNull();
        await using var context = _postgres.CreateContext();
        (await context.ServicePackages.FindAsync(fallback.Id))!.ImageUrl.Should().BeNull("the fallback is computed when reading");
    }
}
