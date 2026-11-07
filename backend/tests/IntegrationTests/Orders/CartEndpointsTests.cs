using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Orders;

/// <summary>UC-SPA-10 endpoints (docs/specs/orders.md ORD-T01–T07) against PostgreSQL.</summary>
[Collection(PostgresCollection.Name)]
public sealed class CartEndpointsTests : IAsyncLifetime
{
    private const string Items = "/api/v1/me/cart/items";
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private OrderApi _orders = null!;

    public CartEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CatalogApi(_factory, _postgres);
        _orders = new OrderApi(_factory, _postgres, _api);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task AddServiceThenPackageCreatesCartWithCurrentPrices()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da mặt", price: 350_000);
        var package = await _api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service], price: 2_000_000);

        var (first, _) = await _api.SendJsonAsync(HttpMethod.Post, Items, new { spaServiceId = service.Id }, token);
        var (second, body) = await _api.SendJsonAsync(HttpMethod.Post, Items, new { servicePackageId = package.Id }, token);

        first.StatusCode.Should().Be(HttpStatusCode.Created);
        second.StatusCode.Should().Be(HttpStatusCode.Created);
        second.Headers.Location!.ToString().Should().Be("/api/v1/me/cart");
        var data = CatalogApi.Data(body);
        data.GetProperty("itemCount").GetInt32().Should().Be(2);
        data.GetProperty("totalAmount").GetDecimal().Should().Be(2_350_000);
        var items = data.GetProperty("items").EnumerateArray().ToList();
        items[0].GetProperty("type").GetString().Should().Be("service");
        items[0].GetProperty("unitPrice").GetDecimal().Should().Be(350_000);
        items[1].GetProperty("type").GetString().Should().Be("package");
        items[1].GetProperty("productId").GetGuid().Should().Be(package.Id);
        await using var context = _postgres.CreateContext();
        (await context.Carts.CountAsync(cart => cart.CustomerId == customerId)).Should().Be(1);
    }

    [Fact]
    public async Task SameProductTwiceConflicts()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da mặt");
        await _api.SendJsonAsync(HttpMethod.Post, Items, new { spaServiceId = service.Id }, token);

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, Items, new { spaServiceId = service.Id }, token);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(body).Should().Be("cart_item_exists");
    }

    [Fact]
    public async Task ConcurrentAddSameProductYieldsOneRow()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da mặt");

        var responses = await Task.WhenAll(Enumerable.Range(0, 2)
            .Select(_ => _api.SendJsonAsync(HttpMethod.Post, Items, new { spaServiceId = service.Id }, token)));

        responses.Select(result => result.Response.StatusCode).Should().BeEquivalentTo([HttpStatusCode.Created, HttpStatusCode.Conflict]);
        await using var context = _postgres.CreateContext();
        (await context.Carts.CountAsync(cart => cart.CustomerId == customerId)).Should().Be(1);
        (await context.CartItems.CountAsync(item => item.Cart.CustomerId == customerId)).Should().Be(1);
    }

    [Fact]
    public async Task HiddenProductsAndBadBodiesAreRejected()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var discontinued = await _api.SeedServiceAsync(CatalogApi.NewTag() + " ngừng", status: CatalogStatus.Discontinued);
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da");
        var yesterday = NhuNguyetSpa.Application.Common.SpaTime.Today(_factory.Clock.UtcNow).AddDays(-1);
        var outOfWindow = await _api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service], saleEnd: yesterday);

        var (r1, b1) = await _api.SendJsonAsync(HttpMethod.Post, Items, new { spaServiceId = discontinued.Id }, token);
        r1.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(b1).Should().Be("service_not_found");
        var (r2, b2) = await _api.SendJsonAsync(HttpMethod.Post, Items, new { servicePackageId = outOfWindow.Id }, token);
        r2.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(b2).Should().Be("package_not_found");
        (await _api.SendJsonAsync(HttpMethod.Post, Items, new { spaServiceId = Guid.NewGuid() }, token)).Response.StatusCode
            .Should().Be(HttpStatusCode.NotFound);
        (await _api.SendJsonAsync(HttpMethod.Post, Items, new { spaServiceId = service.Id, servicePackageId = outOfWindow.Id }, token)).Response.StatusCode
            .Should().Be(HttpStatusCode.BadRequest);
        (await _api.SendJsonAsync(HttpMethod.Post, Items, new { }, token)).Response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task FullCartIsRejected()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        for (var i = 0; i < 20; i++)
        {
            var service = await _api.SeedServiceAsync($"{CatalogApi.NewTag()} dịch vụ {i}");
            (await _api.SendJsonAsync(HttpMethod.Post, Items, new { spaServiceId = service.Id }, token)).Response.StatusCode
                .Should().Be(HttpStatusCode.Created);
        }
        var extra = await _api.SeedServiceAsync(CatalogApi.NewTag() + " thêm");

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, Items, new { spaServiceId = extra.Id }, token);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(body).Should().Be("cart_full");
    }

    [Fact]
    public async Task ViewFlagsPriceChangesAndUnavailableProducts()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var (empty, emptyBody) = await _api.GetAsync("/api/v1/me/cart", token);
        empty.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(emptyBody).GetProperty("itemCount").GetInt32().Should().Be(0);

        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da", price: 300_000);
        var package = await _api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service], price: 1_000_000);
        await _api.SendJsonAsync(HttpMethod.Post, Items, new { spaServiceId = service.Id }, token);
        await _api.SendJsonAsync(HttpMethod.Post, Items, new { servicePackageId = package.Id }, token);
        await using (var context = _postgres.CreateContext())
        {
            var storedService = await context.SpaServices.SingleAsync(row => row.Id == service.Id);
            storedService.Price = 360_000;
            var storedPackage = await context.ServicePackages.SingleAsync(row => row.Id == package.Id);
            storedPackage.ChangeStatus(CatalogStatus.Discontinued);
            await context.SaveChangesAsync();
        }

        var (_, body) = await _api.GetAsync("/api/v1/me/cart", token);

        var data = CatalogApi.Data(body);
        data.GetProperty("totalAmount").GetDecimal().Should().Be(360_000);
        var items = data.GetProperty("items").EnumerateArray().ToList();
        items[0].GetProperty("priceChanged").GetBoolean().Should().BeTrue();
        items[0].GetProperty("currentPrice").GetDecimal().Should().Be(360_000);
        items[0].GetProperty("unitPrice").GetDecimal().Should().Be(300_000);
        items[1].GetProperty("isAvailable").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task ViewingWithoutCartCreatesNothing()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();

        await _api.GetAsync("/api/v1/me/cart", token);

        await using var context = _postgres.CreateContext();
        (await context.Carts.AnyAsync(cart => cart.CustomerId == customerId)).Should().BeFalse();
    }

    [Fact]
    public async Task RemoveOwnItemButNotSomeoneElses()
    {
        var (owner, _) = await _orders.LoginCustomerAsync();
        var (other, _) = await _orders.LoginCustomerAsync();
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da");
        var (_, added) = await _api.SendJsonAsync(HttpMethod.Post, Items, new { spaServiceId = service.Id }, owner);
        var itemId = CatalogApi.Data(added).GetProperty("items")[0].GetProperty("id").GetGuid();

        var (foreign, foreignBody) = await _api.SendAsync(HttpMethod.Delete, $"{Items}/{itemId}", null, other);
        foreign.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(foreignBody).Should().Be("cart_item_not_found");

        var (own, body) = await _api.SendAsync(HttpMethod.Delete, $"{Items}/{itemId}", null, owner);
        own.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(body).GetProperty("itemCount").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task OnlyCustomersUseTheCart()
    {
        var staff = await _api.LoginAsync(UserRole.Staff);
        var owner = await _api.LoginAsync(UserRole.Owner);

        (await _api.GetAsync("/api/v1/me/cart", staff)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _api.GetAsync("/api/v1/me/cart", owner)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _api.GetAsync("/api/v1/me/cart")).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task DuplicateRowsAreRejectedByTheDatabase()
    {
        var customerId = await _orders.SeedCustomerAsync();
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da");
        await using var context = _postgres.CreateContext();
        var cart = new Cart { CustomerId = customerId };
        context.Carts.Add(cart);
        context.CartItems.AddRange(
            new CartItem { CartId = cart.Id, SpaServiceId = service.Id, UnitPrice = 1, AddedAtUtc = DateTime.UtcNow },
            new CartItem { CartId = cart.Id, SpaServiceId = service.Id, UnitPrice = 1, AddedAtUtc = DateTime.UtcNow });

        await FluentActions.Invoking(() => context.SaveChangesAsync()).Should().ThrowAsync<DbUpdateException>();
    }
}
