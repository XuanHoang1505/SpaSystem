using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Orders;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Promotions;

/// <summary>UC-SPA-14 endpoints (docs/specs/orders.md PRM-T01, T02, T04–T08) against PostgreSQL.</summary>
[Collection(PostgresCollection.Name)]
public sealed class PromotionEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private OrderApi _orders = null!;
    private string _owner = null!;

    public PromotionEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CatalogApi(_factory, _postgres);
        _orders = new OrderApi(_factory, _postgres, _api);
        _owner = await _api.LoginAsync(UserRole.Owner);
    }

    public async Task DisposeAsync()
    {
        _api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private object Body(string code, decimal value = 20, string type = "percentage", int? usageLimit = 100, int endsInDays = 30) => new
    {
        code,
        description = "Giảm giá mùa thu",
        discountType = type,
        discountValue = value,
        minOrderAmount = 300_000,
        maxDiscountAmount = type == "percentage" ? 100_000 : (int?)null,
        startsAtUtc = _factory.Clock.UtcNow.AddDays(-1),
        endsAtUtc = _factory.Clock.UtcNow.AddDays(endsInDays),
        perCustomerLimit = 1,
        usageLimit,
    };

    [Fact]
    public async Task OwnerCreatesPromotionWithNormalizedCode()
    {
        var code = OrderApi.NewCode();

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/promotions", Body("  " + code.ToLowerInvariant() + " "), _owner);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var data = CatalogApi.Data(body);
        var id = data.GetProperty("id").GetGuid();
        response.Headers.Location!.ToString().Should().EndWith($"/api/v1/promotions/{id}");
        data.GetProperty("code").GetString().Should().Be(code);
        data.GetProperty("status").GetString().Should().Be("active");
        data.GetProperty("discountType").GetString().Should().Be("percentage");
        data.GetProperty("usedCount").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task DuplicateCodeIgnoringCaseConflicts()
    {
        var code = OrderApi.NewCode();
        await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/promotions", Body(code), _owner);

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/promotions", Body(code.ToLowerInvariant()), _owner);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(body).Should().Be("promotion_code_exists");
    }

    [Fact]
    public async Task InvalidDataIsRejectedPerField()
    {
        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/promotions", Body(OrderApi.NewCode(), value: 100.01m), _owner);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body.RootElement.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("field").GetString())
            .Should().Contain(field => field!.Equals("discountValue", StringComparison.OrdinalIgnoreCase));

        (response, _) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/promotions", Body(OrderApi.NewCode(), endsInDays: -1), _owner);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (response, _) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/promotions", Body("A B"), _owner);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ListFiltersAndCountsOnlyPaidOrders()
    {
        var tag = OrderApi.NewCode();
        var used = await _orders.SeedPromotionAsync(tag + "A");
        var stopped = await _orders.SeedPromotionAsync(tag + "B", status: PromotionStatus.Stopped);
        var customer = await _orders.SeedCustomerAsync();
        await _orders.SeedOrderAsync(customer, OrderStatus.Paid, used);
        await _orders.SeedOrderAsync(customer, OrderStatus.PendingPayment, used);
        await _orders.SeedOrderAsync(customer, OrderStatus.Expired, used);

        var (response, body) = await _api.GetAsync($"/api/v1/promotions?search={tag}&status=active", _owner);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var items = CatalogApi.Data(body).GetProperty("items").EnumerateArray().ToList();
        items.Should().ContainSingle().Which.GetProperty("id").GetGuid().Should().Be(used.Id);
        items[0].GetProperty("usedCount").GetInt32().Should().Be(1);

        (_, body) = await _api.GetAsync($"/api/v1/promotions?search={tag}", _owner);
        CatalogApi.Data(body).GetProperty("totalCount").GetInt32().Should().Be(2);
        (_, body) = await _api.GetAsync($"/api/v1/promotions?search={tag}&status=stopped", _owner);
        CatalogApi.Data(body).GetProperty("items")[0].GetProperty("id").GetGuid().Should().Be(stopped.Id);
    }

    [Fact]
    public async Task ListByDateRangeKeepsOverlappingPromotions()
    {
        var tag = OrderApi.NewCode();
        var now = _factory.Clock.UtcNow;
        var past = await _orders.SeedPromotionAsync(tag + "PAST", startsAtUtc: now.AddDays(-60), endsAtUtc: now.AddDays(-40));
        var current = await _orders.SeedPromotionAsync(tag + "NOW", startsAtUtc: now.AddDays(-5), endsAtUtc: now.AddDays(5));
        var today = NhuNguyetSpa.Application.Common.SpaTime.Today(now);

        var (_, body) = await _api.GetAsync(
            $"/api/v1/promotions?search={tag}&fromDate={today.AddDays(-1):yyyy-MM-dd}&toDate={today.AddDays(1):yyyy-MM-dd}", _owner);

        CatalogApi.Data(body).GetProperty("items").EnumerateArray().Select(item => item.GetProperty("id").GetGuid())
            .Should().Equal(current.Id).And.NotContain(past.Id);
    }

    [Fact]
    public async Task ValueChangeIsBlockedOnlyWhenACountedUseExists()
    {
        var withPaid = await _orders.SeedPromotionAsync();
        var withExpired = await _orders.SeedPromotionAsync();
        var customer = await _orders.SeedCustomerAsync();
        await _orders.SeedOrderAsync(customer, OrderStatus.Paid, withPaid);
        await _orders.SeedOrderAsync(customer, OrderStatus.Expired, withExpired);

        var (blocked, body) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/promotions/{withPaid.Id}", Body(withPaid.Code, value: 30), _owner);
        blocked.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(body).Should().Be("promotion_in_use");

        var (allowed, _) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/promotions/{withExpired.Id}", Body(withExpired.Code, value: 30), _owner);
        allowed.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task OtherFieldsStayEditableAndUsageLimitCannotDropBelowCounted()
    {
        var promotion = await _orders.SeedPromotionAsync(value: 20, maxDiscount: 100_000);
        var customer = await _orders.SeedCustomerAsync();
        await _orders.SeedOrderAsync(customer, OrderStatus.Paid, promotion);
        await _orders.SeedOrderAsync(customer, OrderStatus.PendingPayment, promotion);

        var (ok, body) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/promotions/{promotion.Id}", Body(promotion.Code, endsInDays: 60), _owner);
        ok.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(body).GetProperty("minOrderAmount").GetDecimal().Should().Be(300_000);

        var (low, lowBody) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/promotions/{promotion.Id}", Body(promotion.Code, usageLimit: 1), _owner);
        low.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(lowBody).Should().Be("promotion_usage_limit_below_used");
    }

    [Fact]
    public async Task StopAndReopen()
    {
        var promotion = await _orders.SeedPromotionAsync();

        (await _api.SendJsonAsync(HttpMethod.Patch, $"/api/v1/promotions/{promotion.Id}/status", new { status = "stopped" }, _owner))
            .Response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await _api.SendJsonAsync(HttpMethod.Patch, $"/api/v1/promotions/{promotion.Id}/status", new { status = "stopped" }, _owner))
            .Response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        await using (var context = _postgres.CreateContext())
            (await context.Promotions.SingleAsync(row => row.Id == promotion.Id)).Status.Should().Be(PromotionStatus.Stopped);

        (await _api.SendJsonAsync(HttpMethod.Patch, $"/api/v1/promotions/{promotion.Id}/status", new { status = "active" }, _owner))
            .Response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await _api.SendJsonAsync(HttpMethod.Patch, $"/api/v1/promotions/{promotion.Id}/status", new { status = "expired" }, _owner))
            .Response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await _api.GetAsync($"/api/v1/promotions/{Guid.NewGuid()}", _owner)).Response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task OnlyOwnerManagesPromotions()
    {
        var customer = await _api.LoginAsync(UserRole.Customer);
        var staff = await _api.LoginAsync(UserRole.Staff);

        (await _api.GetAsync("/api/v1/promotions", customer)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/promotions", Body(OrderApi.NewCode()), staff)).Response.StatusCode
            .Should().Be(HttpStatusCode.Forbidden);
        var (anonymous, body) = await _api.GetAsync("/api/v1/promotions");
        anonymous.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        body.RootElement.GetProperty("success").GetBoolean().Should().BeFalse();
        (await _api.SendAsync(HttpMethod.Delete, $"/api/v1/promotions/{Guid.NewGuid()}", null, _owner)).Response.StatusCode
            .Should().Be(HttpStatusCode.MethodNotAllowed);
    }
}
