using System.Net;
using System.Text.Json;
using FluentAssertions;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Bookings;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Orders;

/// <summary>UC-SPA-13 over HTTP and the order permissions (docs/specs/orders.md: BR-ORD-04, 11, ORD-T39…T42).</summary>
[Collection(PostgresCollection.Name)]
public sealed class OwnerOrderEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CustomerBookingApi _api = null!;
    private string _owner = null!;

    public OwnerOrderEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    private OrderApi Orders => _api.Orders;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CustomerBookingApi(_factory, _postgres);
        _owner = await _api.Api.LoginAsync(UserRole.Owner);
    }

    public async Task DisposeAsync()
    {
        _api.Dispose();
        _api.Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private Task<(HttpResponseMessage Response, JsonDocument Body)> ListAsync(string query) => _api.Api.GetAsync("/api/v1/orders?" + query, _owner);

    private static JsonElement[] Items(JsonDocument body) => CatalogApi.Data(body).GetProperty("items").EnumerateArray().ToArray();

    private static string[] Codes(JsonDocument body) => Items(body).Select(item => item.GetProperty("code").GetString()!).ToArray();

    [Fact]
    public async Task SearchMatchesPartialLowerCaseCode()
    {
        var order = await Orders.SeedOrderAsync(await Orders.SeedCustomerAsync(), OrderStatus.Paid);

        var (response, body) = await ListAsync("search=" + order.Code[2..10].ToLowerInvariant());

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        Codes(body).Should().Equal(order.Code);
    }

    [Fact]
    public async Task SearchMatchesCustomerNameWithoutAccents()
    {
        var tag = CatalogApi.NewTag();
        var customerId = await Orders.SeedCustomerAsync($"Nguyễn Thị Nguyệt {tag}");
        var order = await Orders.SeedOrderAsync(customerId, OrderStatus.Paid);

        var (_, body) = await ListAsync($"search=nguyet {tag}");

        Codes(body).Should().Equal(order.Code);
        var customer = Items(body)[0].GetProperty("customer");
        customer.GetProperty("id").GetGuid().Should().Be(customerId);
        customer.GetProperty("fullName").GetString().Should().Be($"Nguyễn Thị Nguyệt {tag}");
    }

    [Fact]
    public async Task SearchMatchesPhone()
    {
        var customerId = await Orders.SeedCustomerAsync();
        var order = await Orders.SeedOrderAsync(customerId, OrderStatus.Paid);
        var (_, detail) = await _api.Api.GetAsync($"/api/v1/orders/{order.Id}", _owner);
        var phone = CatalogApi.Data(detail).GetProperty("customer").GetProperty("phoneNumber").GetString()!;

        var (_, body) = await ListAsync("search=" + phone);

        Codes(body).Should().Equal(order.Code);
    }

    [Fact]
    public async Task SortsByGrandTotalAscAndFiltersStatusAndDates()
    {
        var tag = CatalogApi.NewTag();
        var customerId = await Orders.SeedCustomerAsync("Khách " + tag);
        var day = new DateTime(2026, 6, 10, 3, 0, 0, DateTimeKind.Utc);
        var big = await Orders.SeedOrderAsync(customerId, OrderStatus.Paid, amount: 900_000, createdAtUtc: day);
        var small = await Orders.SeedOrderAsync(customerId, OrderStatus.Paid, amount: 100_000, createdAtUtc: day.AddHours(1));
        await Orders.SeedOrderAsync(customerId, OrderStatus.Expired, amount: 50_000, createdAtUtc: day);
        await Orders.SeedOrderAsync(customerId, OrderStatus.Paid, amount: 10_000, createdAtUtc: day.AddDays(3));

        var (_, sorted) = await ListAsync($"search={tag}&status=paid&fromDate=2026-06-10&toDate=2026-06-11&sortBy=grandTotal&sortDirection=asc");
        var (_, newest) = await ListAsync($"search={tag}&status=paid&fromDate=2026-06-10&toDate=2026-06-11");

        Codes(sorted).Should().Equal(small.Code, big.Code);
        Codes(newest).Should().Equal(small.Code, big.Code);
    }

    [Fact]
    public async Task ListShowsPaymentAndPromotionSummary()
    {
        var (token, _) = await Orders.LoginCustomerAsync();
        var promotion = await Orders.SeedPromotionAsync();
        var service = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ", price: 500_000);
        var (_, created) = await Orders.CreateOrderAsync(token, new { source = "buy_now", spaServiceId = service.Id, promotionCode = promotion.Code });
        var data = CatalogApi.Data(created);
        var orderId = data.GetProperty("id").GetGuid();
        var total = data.GetProperty("grandTotal").GetDecimal();
        (await _api.IpnAsync(await _api.StartPaymentAsync(token, orderId), total, success: false)).Should().Be("00");
        _factory.Clock.Offset = TimeSpan.FromSeconds(1);
        await _api.StartPaymentAsync(token, orderId);

        var (_, body) = await ListAsync("search=" + data.GetProperty("code").GetString());

        var row = Items(body).Single();
        row.GetProperty("paymentCount").GetInt32().Should().Be(2);
        row.GetProperty("latestPaymentStatus").GetString().Should().Be("pending");
        row.GetProperty("promotionCode").GetString().Should().Be(promotion.Code);
        row.GetProperty("itemCount").GetInt32().Should().Be(1);
    }

    [Theory]
    [InlineData("sortBy=customer", "sortBy")]
    [InlineData("status=unknown", "Status")]
    [InlineData("fromDate=2026-11-02&toDate=2026-11-01", "ToDate")]
    public async Task RejectsBadSortBy(string query, string field)
    {
        var (response, body) = await ListAsync(query);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body.RootElement.GetProperty("errors")[0].GetProperty("field").GetString().Should().Be(field);
    }

    [Fact]
    public async Task DetailHasCustomerPaymentsAndHold()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var (_, booked) = await _api.BookNowAsync(token, service.Id, CustomerBookingApi.Day, new TimeOnly(9, 0), staff.Id);
        var order = CatalogApi.Data(booked).GetProperty("order");
        var orderId = order.GetProperty("id").GetGuid();
        var total = order.GetProperty("grandTotal").GetDecimal();
        (await _api.IpnAsync(await _api.StartPaymentAsync(token, orderId), total, success: false)).Should().Be("00");
        await _api.StartPaymentAsync(token, orderId);

        var (response, body) = await _api.Api.GetAsync($"/api/v1/orders/{orderId}", _owner);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("customer").GetProperty("id").GetGuid().Should().Be(customerId);
        data.GetProperty("customer").GetProperty("email").GetString().Should().Contain("@");
        var payments = data.GetProperty("payments").EnumerateArray().ToArray();
        payments.Should().HaveCount(2);
        payments[0].GetProperty("requestCode").GetString().Should().Be(order.GetProperty("code").GetString() + "01");
        payments[0].GetProperty("status").GetString().Should().Be("failed");
        payments[0].GetProperty("providerTransactionId").ValueKind.Should().NotBe(JsonValueKind.Undefined);
        payments[1].GetProperty("expiresAtUtc").GetDateTime().Should().Be(order.GetProperty("paymentDueAtUtc").GetDateTime());
        data.GetProperty("appointment").GetProperty("status").GetString().Should().Be("held");
        data.GetProperty("canCancel").GetBoolean().Should().BeTrue();
        data.GetProperty("isPayable").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task DetailMissingNotFound()
    {
        var (response, body) = await _api.Api.GetAsync($"/api/v1/orders/{Guid.NewGuid()}", _owner);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(body).Should().Be("order_not_found");
    }

    [Fact]
    public async Task OwnerCancelsWithReason()
    {
        var order = await Orders.SeedOrderAsync(await Orders.SeedCustomerAsync(), OrderStatus.PendingPayment);

        var (response, body) = await Orders.OwnerCancelAsync(_owner, order.Id, " Khách gọi điện hủy ");

        response.StatusCode.Should().Be(HttpStatusCode.OK, body.RootElement.ToString());
        var data = CatalogApi.Data(body);
        data.GetProperty("status").GetString().Should().Be("cancelled");
        data.GetProperty("cancellationReason").GetString().Should().Be("Khách gọi điện hủy");
        data.GetProperty("canCancel").GetBoolean().Should().BeFalse();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("  ")]
    public async Task OwnerReasonRequired(string? reason)
    {
        var order = await Orders.SeedOrderAsync(await Orders.SeedCustomerAsync(), OrderStatus.PendingPayment);

        var (response, body) = await Orders.OwnerCancelAsync(_owner, order.Id, reason);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body.RootElement.GetProperty("errors")[0].GetProperty("field").GetString().Should().Be("Reason");
    }

    [Fact]
    public async Task OwnerCannotCancelPaid()
    {
        var order = await Orders.SeedOrderAsync(await Orders.SeedCustomerAsync(), OrderStatus.Paid);

        var (response, body) = await Orders.OwnerCancelAsync(_owner, order.Id);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(body).Should().Be("order_not_cancellable");
    }

    [Theory]
    [InlineData(UserRole.Customer, "GET", "/api/v1/orders")]
    [InlineData(UserRole.Staff, "GET", "/api/v1/orders")]
    [InlineData(UserRole.Customer, "GET", "/api/v1/orders/{id}")]
    [InlineData(UserRole.Staff, "POST", "/api/v1/orders/{id}/cancel")]
    [InlineData(UserRole.Customer, "POST", "/api/v1/orders/{id}/cancel")]
    [InlineData(UserRole.Owner, "GET", "/api/v1/me/orders")]
    [InlineData(UserRole.Staff, "GET", "/api/v1/me/orders")]
    [InlineData(UserRole.Owner, "POST", "/api/v1/me/orders/{id}/cancel")]
    [InlineData(UserRole.Staff, "POST", "/api/v1/me/orders/{id}/cancel")]
    public async Task WrongRoleIsForbidden(UserRole role, string method, string path)
    {
        var token = await _api.Api.LoginAsync(role);

        var (response, body) = await SendAsync(method, path.Replace("{id}", Guid.NewGuid().ToString()), token);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        body.RootElement.GetProperty("success").GetBoolean().Should().BeFalse();
    }

    [Theory]
    [InlineData("GET", "/api/v1/orders")]
    [InlineData("GET", "/api/v1/orders/{id}")]
    [InlineData("POST", "/api/v1/orders/{id}/cancel")]
    [InlineData("GET", "/api/v1/me/orders")]
    [InlineData("POST", "/api/v1/me/orders/{id}/cancel")]
    public async Task NoBearerIsUnauthorized(string method, string path)
    {
        var (response, body) = await SendAsync(method, path.Replace("{id}", Guid.NewGuid().ToString()), null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        body.RootElement.GetProperty("success").GetBoolean().Should().BeFalse();
    }

    private Task<(HttpResponseMessage Response, JsonDocument Body)> SendAsync(string method, string path, string? token) =>
        method == "GET" ? _api.Api.GetAsync(path, token) : _api.Api.SendJsonAsync(HttpMethod.Post, path, new { reason = "Đổi ý" }, token);
}
