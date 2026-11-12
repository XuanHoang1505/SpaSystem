using System.Net;
using System.Text.Json;
using FluentAssertions;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Orders;

/// <summary>UC-SPA-12 list over HTTP (docs/specs/orders.md: BR-ORD-11, ORD-T30, T31).</summary>
[Collection(PostgresCollection.Name)]
public sealed class MyOrderListTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private OrderApi _orders = null!;

    public MyOrderListTests(PostgresFixture postgres) => _postgres = postgres;

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

    private Task<(HttpResponseMessage Response, JsonDocument Body)> ListAsync(string token, string query = "") =>
        _api.GetAsync("/api/v1/me/orders" + (query.Length > 0 ? "?" + query : string.Empty), token);

    private static string[] Codes(JsonDocument body) =>
        CatalogApi.Data(body).GetProperty("items").EnumerateArray().Select(item => item.GetProperty("code").GetString()!).ToArray();

    [Fact]
    public async Task ListsOnlyOwnOrdersNewestFirst()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var otherId = await _orders.SeedCustomerAsync();
        var now = _factory.Clock.UtcNow;
        var oldest = await _orders.SeedOrderAsync(customerId, OrderStatus.Paid, createdAtUtc: now.AddDays(-3));
        var middle = await _orders.SeedOrderAsync(customerId, OrderStatus.Expired, createdAtUtc: now.AddDays(-2));
        var cancelled = await _orders.SeedOrderAsync(customerId, OrderStatus.Cancelled, createdAtUtc: now.AddDays(-1));
        var newest = await _orders.SeedOrderAsync(customerId, OrderStatus.PendingPayment);
        await _orders.SeedOrderAsync(otherId, OrderStatus.Paid);

        var (response, body) = await ListAsync(token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        Codes(body).Should().Equal(newest.Code, cancelled.Code, middle.Code, oldest.Code);
        var first = CatalogApi.Data(body).GetProperty("items")[0];
        first.GetProperty("status").GetString().Should().Be("pending_payment");
        first.GetProperty("itemCount").GetInt32().Should().Be(1);
        first.GetProperty("productNames")[0].GetString().Should().Be(newest.Items.Single().ProductName);
        CatalogApi.Data(body).GetProperty("totalCount").GetInt32().Should().Be(4);
    }

    [Fact]
    public async Task FiltersByStatus()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var paid = await _orders.SeedOrderAsync(customerId, OrderStatus.Paid);
        await _orders.SeedOrderAsync(customerId, OrderStatus.PendingPayment);

        var (_, body) = await ListAsync(token, "status=paid");

        Codes(body).Should().Equal(paid.Code);
    }

    [Fact]
    public async Task DateFilterUsesVietnamDayBoundaries()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        // 2026-11-01 23:59 and 2026-11-02 00:00 in Vietnam (UTC+7).
        var lastMinute = await _orders.SeedOrderAsync(customerId, OrderStatus.Paid, createdAtUtc: new DateTime(2026, 11, 1, 16, 59, 0, DateTimeKind.Utc));
        var nextDay = await _orders.SeedOrderAsync(customerId, OrderStatus.Paid, createdAtUtc: new DateTime(2026, 11, 1, 17, 0, 0, DateTimeKind.Utc));

        var (_, first) = await ListAsync(token, "fromDate=2026-11-01&toDate=2026-11-01");
        var (_, second) = await ListAsync(token, "fromDate=2026-11-02&toDate=2026-11-02");

        Codes(first).Should().Equal(lastMinute.Code);
        Codes(second).Should().Equal(nextDay.Code);
    }

    [Theory]
    [InlineData("status=done", "Status")]
    [InlineData("fromDate=2026-11-02&toDate=2026-11-01", "ToDate")]
    public async Task RejectsBadStatusAndReversedRange(string query, string field)
    {
        var (token, _) = await _orders.LoginCustomerAsync();

        var (response, body) = await ListAsync(token, query);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body.RootElement.GetProperty("errors")[0].GetProperty("field").GetString().Should().Be(field);
    }

    [Fact]
    public async Task FlagsForPendingOverduePaid()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var now = _factory.Clock.UtcNow;
        var pending = await _orders.SeedOrderAsync(customerId, OrderStatus.PendingPayment, createdAtUtc: now.AddMinutes(-3));
        var overdue = await _orders.SeedOrderAsync(customerId, OrderStatus.PendingPayment, createdAtUtc: now.AddMinutes(-20),
            paymentDueAtUtc: now.AddMinutes(-5));
        var paid = await _orders.SeedOrderAsync(customerId, OrderStatus.Paid, createdAtUtc: now.AddMinutes(-60));

        var (_, body) = await ListAsync(token);

        var flags = CatalogApi.Data(body).GetProperty("items").EnumerateArray()
            .ToDictionary(item => item.GetProperty("code").GetString()!,
                item => (item.GetProperty("isPayable").GetBoolean(), item.GetProperty("canCancel").GetBoolean()));
        flags[pending.Code].Should().Be((true, true));
        flags[overdue.Code].Should().Be((false, true));
        flags[paid.Code].Should().Be((false, false));
        var (_, detail) = await _api.GetAsync($"/api/v1/me/orders/{overdue.Id}", token);
        CatalogApi.Data(detail).GetProperty("isPayable").GetBoolean().Should().BeFalse();
        CatalogApi.Data(detail).GetProperty("canCancel").GetBoolean().Should().BeTrue();
    }
}
