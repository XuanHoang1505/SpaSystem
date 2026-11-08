using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Catalog;

/// <summary>UC-SPA-09 owner writes (docs/specs/catalog.md CAT-T13..T23) against PostgreSQL.</summary>
[Collection(PostgresCollection.Name)]
public sealed class CatalogManageEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private string _owner = null!;
    private Guid _categoryId;

    public CatalogManageEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CatalogApi(_factory, _postgres);
        _owner = await _api.LoginAsync(UserRole.Owner);
        _categoryId = (await _api.SeedCategoryAsync("Chăm sóc da")).Id;
    }

    public async Task DisposeAsync()
    {
        _api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private object NewService(string name, Guid? categoryId = null, int durationMinutes = 60, decimal price = 350_000) =>
        new { name, categoryId = categoryId ?? _categoryId, description = "Làm sạch sâu", durationMinutes, price };

    [Fact]
    public async Task ShortDescriptionAndStepsAreSavedReplacedAndKept()
    {
        var tag = CatalogApi.NewTag();
        var body = new
        {
            name = $"{tag} quy trình", categoryId = _categoryId, description = "Mô tả dài", durationMinutes = 60, price = 300_000,
            shortDescription = "   ",
            steps = new object[]
            {
                new { title = "Làm sạch", durationMinutes = 10 },
                new { title = "Đắp mặt nạ", description = "Mặt nạ thảo mộc", durationMinutes = 20 },
                new { title = "Thư giãn" },
            },
        };

        var (created, createdBody) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services", body, _owner);
        var id = CatalogApi.Data(createdBody).GetProperty("id").GetGuid();
        var update = new
        {
            name = $"{tag} quy trình", categoryId = _categoryId, description = "Mô tả dài", durationMinutes = 60, price = 300_000,
            shortDescription = "Làm sạch và cấp ẩm",
        };
        var (kept, keptBody) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/services/{id}", update, _owner);
        var (replaced, replacedBody) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/services/{id}",
            new { update.name, update.categoryId, update.durationMinutes, update.price, steps = new object[] { new { title = "Mới 1" }, new { title = "Mới 2" } } },
            _owner);
        var (cleared, clearedBody) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/services/{id}",
            new { update.name, update.categoryId, update.durationMinutes, update.price, steps = Array.Empty<object>() }, _owner);

        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var data = CatalogApi.Data(createdBody);
        data.GetProperty("shortDescription").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null, "blank is stored as null (CAT-T42)");
        Steps(createdBody).Should().Equal((1, "Làm sạch"), (2, "Đắp mặt nạ"), (3, "Thư giãn"));
        kept.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(keptBody).GetProperty("shortDescription").GetString().Should().Be("Làm sạch và cấp ẩm");
        Steps(keptBody).Should().HaveCount(3, "no step list keeps the steps (CAT-T44)");
        replaced.StatusCode.Should().Be(HttpStatusCode.OK);
        Steps(replacedBody).Should().Equal((1, "Mới 1"), (2, "Mới 2"));
        cleared.StatusCode.Should().Be(HttpStatusCode.OK);
        Steps(clearedBody).Should().BeEmpty();
        await using var context = _postgres.CreateContext();
        (await context.ServiceSteps.CountAsync(step => step.SpaServiceId == id)).Should().Be(0);

        static (int, string)[] Steps(System.Text.Json.JsonDocument document) => CatalogApi.Data(document).GetProperty("steps")
            .EnumerateArray().Select(step => (step.GetProperty("sortOrder").GetInt32(), step.GetProperty("title").GetString()!)).ToArray();
    }

    [Fact]
    public async Task StepsAreValidated()
    {
        var tag = CatalogApi.NewTag();
        object Body(object steps) => new { name = $"{tag} sai", categoryId = _categoryId, durationMinutes = 60, price = 1, steps };

        var (tooLong, tooLongBody) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services",
            new { name = $"{tag} sai", categoryId = _categoryId, durationMinutes = 60, price = 1, shortDescription = new string('a', 201) }, _owner);
        var (noTitle, noTitleBody) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services", Body(new object[] { new { title = "" } }), _owner);
        var (overTime, overTimeBody) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services",
            Body(new object[] { new { title = "A", durationMinutes = 40 }, new { title = "B", durationMinutes = 30 } }), _owner);

        tooLong.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        Fields(tooLongBody).Should().Contain("ShortDescription");
        noTitle.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        Fields(noTitleBody).Should().Contain("Steps[0].Title");
        overTime.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        Fields(overTimeBody).Should().Contain("Steps");

        static string[] Fields(System.Text.Json.JsonDocument document) => document.RootElement.GetProperty("errors")
            .EnumerateArray().Select(error => error.GetProperty("field").GetString()!).ToArray();
    }

    [Fact]
    public async Task OwnerCreatesServiceWithLocationHeaderAndAudit()
    {
        var tag = CatalogApi.NewTag();

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services", NewService($"{tag} mới"), _owner);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var data = CatalogApi.Data(body);
        var id = data.GetProperty("id").GetGuid();
        response.Headers.Location!.ToString().Should().EndWith($"/api/v1/services/{id}");
        data.GetProperty("status").GetString().Should().Be("on_sale");
        data.GetProperty("categoryId").GetGuid().Should().Be(_categoryId);
        data.GetProperty("category").GetString().Should().Be("Chăm sóc da");
        await using var context = _postgres.CreateContext();
        var saved = await context.SpaServices.AsNoTracking().SingleAsync(service => service.Id == id);
        saved.CreatedBy.Should().NotBeNull();
        saved.Price.Should().Be(350_000);
    }

    [Theory]
    [InlineData(0, 100_000, "")]
    [InlineData(60, -1, "")]
    [InlineData(60, 1.5, "")]
    [InlineData(60, 100_000, "x")]
    public async Task CreateServiceRejectsInvalidFields(int duration, decimal price, string emptyName)
    {
        var name = emptyName == "x" ? string.Empty : $"{CatalogApi.NewTag()} biên";

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services", NewService(name, durationMinutes: duration, price: price), _owner);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body.RootElement.GetProperty("success").GetBoolean().Should().BeFalse();
        body.RootElement.GetProperty("errors").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task ServiceCategoryMustExistAndBeVisible()
    {
        var tag = CatalogApi.NewTag();
        var hidden = await _api.SeedCategoryAsync($"{tag} ẩn", isActive: false);
        var kept = await _api.SeedServiceAsync($"{tag} giữ", category: $"{tag} ẩn");

        var (missing, missingBody) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services", NewService($"{tag} a", Guid.NewGuid()), _owner);
        var (inactive, inactiveBody) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services", NewService($"{tag} b", hidden.Id), _owner);
        var (keep, _) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/services/{kept.Id}", NewService($"{tag} giữ 2", hidden.Id), _owner);
        var (noCategory, _) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services", NewService($"{tag} c", Guid.Empty), _owner);

        missing.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(missingBody).Should().Be("service_category_not_found");
        inactive.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(inactiveBody).Should().Be("service_category_inactive");
        keep.StatusCode.Should().Be(HttpStatusCode.OK, "a service may keep the hidden category it already has (CAT-T37)");
        noCategory.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData(UserRole.Customer)]
    [InlineData(UserRole.Staff)]
    public async Task NonOwnerIsForbiddenFromManagingCatalog(UserRole role)
    {
        var bearer = await _api.LoginAsync(role);
        var service = await _api.SeedServiceAsync($"{CatalogApi.NewTag()} cấm");

        var responses = new[]
        {
            await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services", NewService("x"), bearer),
            await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/services/{service.Id}", NewService("x"), bearer),
            await _api.SendJsonAsync(HttpMethod.Patch, $"/api/v1/services/{service.Id}/status", new { status = "discontinued" }, bearer),
            await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/packages", new { name = "x" }, bearer),
            await _api.SendAsync(HttpMethod.Post, $"/api/v1/services/{service.Id}/image", CatalogApi.ImageForm([0xFF, 0xD8, 0xFF]), bearer),
            await _api.SendAsync(HttpMethod.Delete, $"/api/v1/packages/{Guid.NewGuid()}/image", null, bearer),
        };

        foreach (var (response, body) in responses)
        {
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
            CatalogApi.ErrorCode(body).Should().Be("forbidden");
        }
    }

    [Fact]
    public async Task AnonymousWriteReturnsUnauthorized()
    {
        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services", NewService("x"), bearer: null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        CatalogApi.ErrorCode(body).Should().Be("unauthorized");
    }

    [Fact]
    public async Task OwnerCreatesPackageWithItems()
    {
        var tag = CatalogApi.NewTag();
        var first = await _api.SeedServiceAsync($"{tag} một");
        var second = await _api.SeedServiceAsync($"{tag} hai");

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/packages", new
        {
            name = $"{tag} gói",
            price = 3_000_000,
            validityDays = 120,
            saleStartDate = "2026-01-01",
            items = new object[]
            {
                new { spaServiceId = second.Id, sessionCount = 4, sortOrder = 2, minDaysBetweenSessions = 14, note = "Sau buổi 1" },
                new { spaServiceId = first.Id, sessionCount = 2, sortOrder = 1, minDaysBetweenSessions = 7 },
            },
        }, _owner);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var data = CatalogApi.Data(body);
        response.Headers.Location!.ToString().Should().EndWith($"/api/v1/packages/{data.GetProperty("id").GetGuid()}");
        data.GetProperty("totalSessions").GetInt32().Should().Be(6);
        data.GetProperty("saleStartDate").GetString().Should().Be("2026-01-01");
        data.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("serviceName").GetString()).Should().Equal($"{tag} một", $"{tag} hai");
    }

    [Fact]
    public async Task CreatePackageValidatesFieldsAndServices()
    {
        var tag = CatalogApi.NewTag();
        var onSale = await _api.SeedServiceAsync($"{tag} bán");
        var discontinued = await _api.SeedServiceAsync($"{tag} ngừng", status: CatalogStatus.Discontinued);

        var cases = new (object Items, int ValidityDays, string? End, string Code)[]
        {
            (Array.Empty<object>(), 90, null, "validation_error"),
            (new object[] { Item(onSale.Id, 1), Item(discontinued.Id, 1) }, 90, null, "validation_error"),
            (new object[] { Item(onSale.Id, 1), Item(onSale.Id, 2) }, 90, null, "validation_error"),
            (new object[] { new { spaServiceId = onSale.Id, sessionCount = 0, sortOrder = 1, minDaysBetweenSessions = 0 } }, 90, null, "validation_error"),
            (new object[] { new { spaServiceId = onSale.Id, sessionCount = 1, sortOrder = 1, minDaysBetweenSessions = -1 } }, 90, null, "validation_error"),
            (new object[] { Item(onSale.Id, 1) }, 0, null, "validation_error"),
            (new object[] { Item(onSale.Id, 1) }, 90, "2025-12-31", "validation_error"),
            (new object[] { Item(onSale.Id, 1), Item(Guid.NewGuid(), 2) }, 90, null, "package_service_not_found"),
            (new object[] { Item(onSale.Id, 1), Item(discontinued.Id, 2) }, 90, null, "package_service_discontinued"),
        };

        foreach (var (items, validityDays, end, code) in cases)
        {
            var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/packages", new
            {
                name = $"{tag} lỗi", price = 1_000_000, validityDays, saleStartDate = "2026-01-01", saleEndDate = end, items,
            }, _owner);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest, code);
            // FluentValidation failures keep the middleware's per-rule codes; only business rules carry a catalog code.
            if (code != "validation_error")
                CatalogApi.ErrorCode(body).Should().Be(code);
        }

        await using var context = _postgres.CreateContext();
        (await context.ServicePackages.CountAsync(package => package.Name == $"{tag} lỗi")).Should().Be(0);
    }

    [Fact]
    public async Task UpdatePackageReplacesItemsAndKeepsExistingDiscontinuedService()
    {
        var tag = CatalogApi.NewTag();
        var a = await _api.SeedServiceAsync($"{tag} a");
        var b = await _api.SeedServiceAsync($"{tag} b");
        var c = await _api.SeedServiceAsync($"{tag} c");
        var package = await _api.SeedPackageAsync($"{tag} gói", [a, b, c]);
        await using (var context = _postgres.CreateContext())
        {
            var stored = await context.SpaServices.SingleAsync(service => service.Id == a.Id);
            stored.ChangeStatus(CatalogStatus.Discontinued);
            await context.SaveChangesAsync();
        }

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/packages/{package.Id}", new
        {
            name = $"{tag} gói sửa",
            price = 2_500_000,
            validityDays = 60,
            items = new object[] { Item(c.Id, 1), Item(a.Id, 2) },
        }, _owner);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(body).GetProperty("name").GetString().Should().Be($"{tag} gói sửa");
        await using var check = _postgres.CreateContext();
        var items = await check.ServicePackageItems.AsNoTracking().Where(item => item.ServicePackageId == package.Id).OrderBy(item => item.SortOrder).ToListAsync();
        items.Select(item => item.SpaServiceId).Should().Equal(c.Id, a.Id);
        CatalogApi.Data(body).GetProperty("items")[1].GetProperty("serviceStatus").GetString().Should().Be("discontinued");
    }

    [Fact]
    public async Task StatusChangesHideAndShowServicesAndPackages()
    {
        var tag = CatalogApi.NewTag();
        var service = await _api.SeedServiceAsync($"{tag} trạng thái");
        var package = await _api.SeedPackageAsync($"{tag} gói trạng thái", [service]);

        (await Patch($"/api/v1/services/{service.Id}/status", "discontinued")).Should().Be(HttpStatusCode.NoContent);
        (await Patch($"/api/v1/services/{service.Id}/status", "discontinued")).Should().Be(HttpStatusCode.NoContent);
        (await _api.GetAsync($"/api/v1/services/{service.Id}")).Response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await Patch($"/api/v1/services/{service.Id}/status", "on_sale")).Should().Be(HttpStatusCode.NoContent);
        (await _api.GetAsync($"/api/v1/services/{service.Id}")).Response.StatusCode.Should().Be(HttpStatusCode.OK);

        (await Patch($"/api/v1/packages/{package.Id}/status", "discontinued")).Should().Be(HttpStatusCode.NoContent);
        (await _api.GetAsync($"/api/v1/packages/{package.Id}")).Response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await Patch($"/api/v1/packages/{package.Id}/status", "hidden")).Should().Be(HttpStatusCode.BadRequest);
        (await Patch($"/api/v1/packages/{Guid.NewGuid()}/status", "on_sale")).Should().Be(HttpStatusCode.NotFound);

        async Task<HttpStatusCode> Patch(string path, string status) =>
            (await _api.SendJsonAsync(HttpMethod.Patch, path, new { status }, _owner)).Response.StatusCode;
    }

    [Fact]
    public async Task EditingServiceKeepsOrderSnapshotAndServicesCannotBeDeleted()
    {
        var tag = CatalogApi.NewTag();
        var service = await _api.SeedServiceAsync($"{tag} gốc", price: 300_000);
        var buyer = await _factory.CreateUserAsync(CatalogApi.Password, role: UserRole.Customer);
        var orderItemId = Guid.NewGuid();
        await using (var context = _postgres.CreateContext())
        {
            context.Customers.Add(new Customer { Id = buyer.Id });
            var order = new Order
            {
                Code = $"DH-{tag}", CustomerId = buyer.Id, Subtotal = 300_000, GrandTotal = 300_000, Status = OrderStatus.Paid,
                PaymentDueAtUtc = DateTime.UtcNow.AddMinutes(15),
            };
            order.Items.Add(new OrderItem
            {
                Id = orderItemId, OrderId = order.Id, SpaServiceId = service.Id, ProductName = service.Name, UnitPrice = 300_000, LineTotal = 300_000,
            });
            context.Orders.Add(order);
            await context.SaveChangesAsync();
        }

        var (update, _) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/services/{service.Id}", NewService($"{tag} đổi tên", price: 450_000), _owner);
        var (delete, _) = await _api.SendAsync(HttpMethod.Delete, $"/api/v1/services/{service.Id}", null, _owner);

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        delete.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
        await using var check = _postgres.CreateContext();
        var line = await check.OrderItems.AsNoTracking().SingleAsync(item => item.Id == orderItemId);
        line.ProductName.Should().Be($"{tag} gốc");
        line.UnitPrice.Should().Be(300_000);
        (await check.SpaServices.AnyAsync(row => row.Id == service.Id)).Should().BeTrue();
    }

    private static object Item(Guid serviceId, int sortOrder) => new { spaServiceId = serviceId, sessionCount = 1, sortOrder, minDaysBetweenSessions = 0 };
}
