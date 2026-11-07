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

    public CatalogManageEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

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

    private static object NewService(string name, string category = "Chăm sóc da", int durationMinutes = 60, decimal price = 350_000) =>
        new { name, category, description = "Làm sạch sâu", durationMinutes, price };

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
    public async Task CreateServiceReusesExistingCategorySpelling()
    {
        var tag = CatalogApi.NewTag();
        await _api.SeedServiceAsync($"{tag} có sẵn", category: $"Chăm sóc da {tag}");

        var (_, reused) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services", NewService($"{tag} a", $"  cham   soc DA {tag} "), _owner);
        var (_, fresh) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/services", NewService($"{tag} b", $"Massage  body {tag}"), _owner);

        CatalogApi.Data(reused).GetProperty("category").GetString().Should().Be($"Chăm sóc da {tag}");
        CatalogApi.Data(fresh).GetProperty("category").GetString().Should().Be($"Massage body {tag}");
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
