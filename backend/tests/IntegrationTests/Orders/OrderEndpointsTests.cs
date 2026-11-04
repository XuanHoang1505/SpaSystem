using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Orders;

/// <summary>UC-SPA-11 preview, order creation and payment attempts (docs/specs/orders.md ORD-T07–T15, T25; PRM-T07, T11).</summary>
[Collection(PostgresCollection.Name)]
public sealed class OrderEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private OrderApi _orders = null!;

    public OrderEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

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

    private Task<(HttpResponseMessage Response, System.Text.Json.JsonDocument Body)> Preview(string token, object body) =>
        _api.SendJsonAsync(HttpMethod.Post, "/api/v1/me/orders/preview", body, token);

    [Fact]
    public async Task PreviewFromCartAppliesPromotionWithoutSaving()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var first = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da", price: 300_000);
        var second = await _api.SeedServiceAsync(CatalogApi.NewTag() + " massage", price: 500_000);
        await _orders.AddToCartAsync(token, first.Id);
        await _orders.AddToCartAsync(token, second.Id);
        var promotion = await _orders.SeedPromotionAsync(value: 20, maxDiscount: 100_000);

        var (response, body) = await Preview(token, new { source = "cart", promotionCode = promotion.Code.ToLowerInvariant() });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("subtotal").GetDecimal().Should().Be(800_000);
        data.GetProperty("discountTotal").GetDecimal().Should().Be(100_000);
        data.GetProperty("grandTotal").GetDecimal().Should().Be(700_000);
        data.GetProperty("promotion").GetProperty("code").GetString().Should().Be(promotion.Code);
        data.GetProperty("items").EnumerateArray().Sum(item => item.GetProperty("discountAmount").GetDecimal()).Should().Be(100_000);
        await using var context = _postgres.CreateContext();
        (await context.Orders.CountAsync(order => order.CustomerId == customerId)).Should().Be(0);
    }

    [Fact]
    public async Task PreviewReportsBadCodeUnavailableItemsAndEmptyCart()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var (empty, emptyBody) = await Preview(token, new { source = "cart" });
        empty.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(emptyBody).Should().Be("cart_empty");

        var kept = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da", price: 300_000);
        var dropped = await _api.SeedServiceAsync(CatalogApi.NewTag() + " ngừng", price: 200_000);
        await _orders.AddToCartAsync(token, kept.Id);
        await _orders.AddToCartAsync(token, dropped.Id);
        await using (var context = _postgres.CreateContext())
        {
            (await context.SpaServices.SingleAsync(row => row.Id == dropped.Id)).ChangeStatus(CatalogStatus.Discontinued);
            await context.SaveChangesAsync();
        }

        var (response, body) = await Preview(token, new { source = "cart", promotionCode = "KHONGCO" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("promotionError").GetProperty("code").GetString().Should().Be("promotion_invalid");
        data.GetProperty("grandTotal").GetDecimal().Should().Be(300_000);
        data.GetProperty("unavailableItems")[0].GetProperty("productId").GetGuid().Should().Be(dropped.Id);

        var (create, createBody) = await _orders.CreateOrderAsync(token, new { source = "cart" });
        create.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(createBody).Should().Be("order_items_unavailable");
    }

    [Fact]
    public async Task StoppedPromotionIsInvalidInPreview()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var owner = await _api.LoginAsync(UserRole.Owner);
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da", price: 300_000);
        var promotion = await _orders.SeedPromotionAsync();
        await _api.SendJsonAsync(HttpMethod.Patch, $"/api/v1/promotions/{promotion.Id}/status", new { status = "stopped" }, owner);

        var (_, body) = await Preview(token, new { source = "buy_now", spaServiceId = service.Id, promotionCode = promotion.Code });

        CatalogApi.Data(body).GetProperty("promotionError").GetProperty("code").GetString().Should().Be("promotion_invalid");
    }

    [Fact]
    public async Task CreateFromCartUsesCurrentPricesAndRecordsRedemption()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da", price: 300_000);
        await _orders.AddToCartAsync(token, service.Id);
        await using (var context = _postgres.CreateContext())
        {
            (await context.SpaServices.SingleAsync(row => row.Id == service.Id)).Price = 360_000;
            await context.SaveChangesAsync();
        }
        var promotion = await _orders.SeedPromotionAsync(type: DiscountType.FixedAmount, value: 60_000);

        var (response, body) = await _orders.CreateOrderAsync(token, new { source = "cart", promotionCode = promotion.Code });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var data = CatalogApi.Data(body);
        var id = data.GetProperty("id").GetGuid();
        response.Headers.Location!.ToString().Should().EndWith($"/api/v1/me/orders/{id}");
        data.GetProperty("status").GetString().Should().Be("pending_payment");
        data.GetProperty("code").GetString().Should().MatchRegex("^DH\\d{6}[A-HJ-NP-Z2-9]{6}$");
        data.GetProperty("grandTotal").GetDecimal().Should().Be(300_000);
        data.GetProperty("isPayable").GetBoolean().Should().BeTrue();
        data.GetProperty("promotion").GetProperty("discountAmount").GetDecimal().Should().Be(60_000);
        await using var check = _postgres.CreateContext();
        var order = await check.Orders.Include(row => row.Items).SingleAsync(row => row.Id == id);
        order.CustomerId.Should().Be(customerId);
        order.Items.Should().ContainSingle().Which.UnitPrice.Should().Be(360_000);
        // Due time is taken from the service's clock read; created_at is stamped at save, a few milliseconds later.
        order.PaymentDueAtUtc.Should().BeCloseTo(order.CreatedAtUtc.AddMinutes(15), TimeSpan.FromSeconds(5));
        (await check.PromotionRedemptions.SingleAsync(row => row.OrderId == id)).PromotionId.Should().Be(promotion.Id);
        (await check.CartItems.CountAsync(item => item.Cart.CustomerId == customerId)).Should().Be(1, "the cart is emptied only on payment");
    }

    [Fact]
    public async Task BuyNowPackageAndBadBodies()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da");
        var package = await _api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service], price: 1_500_000);

        var (created, body) = await _orders.CreateOrderAsync(token, new { source = "buy_now", servicePackageId = package.Id });
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var items = CatalogApi.Data(body).GetProperty("items");
        items.GetArrayLength().Should().Be(1);
        items[0].GetProperty("type").GetString().Should().Be("package");

        (await _orders.CreateOrderAsync(token, new { source = "buy_now" })).Response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await _orders.CreateOrderAsync(token, new { source = "cart", spaServiceId = service.Id })).Response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await _orders.CreateOrderAsync(token, new { source = "later" })).Response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await _orders.CreateOrderAsync(token, new { source = "buy_now", spaServiceId = Guid.NewGuid() })).Response.StatusCode
            .Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PromotionThatDoesNotApplyBlocksCreation()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da", price: 300_000);
        var promotion = await _orders.SeedPromotionAsync(minOrder: 1_000_000);

        var (response, body) = await _orders.CreateOrderAsync(token, new { source = "buy_now", spaServiceId = service.Id, promotionCode = promotion.Code });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(body).Should().Be("promotion_not_applicable");
        await using var context = _postgres.CreateContext();
        (await context.Orders.CountAsync(order => order.CustomerId == customerId)).Should().Be(0);
    }

    [Fact]
    public async Task SameIdempotencyKeyReturnsTheSameOrder()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da");
        var key = Guid.NewGuid().ToString();
        var body = new { source = "buy_now", spaServiceId = service.Id };

        var (first, firstBody) = await _orders.CreateOrderAsync(token, body, key);
        var (second, secondBody) = await _orders.CreateOrderAsync(token, body, key);
        var (other, _) = await _orders.CreateOrderAsync(token, body, Guid.NewGuid().ToString());
        var (bad, badBody) = await _orders.CreateOrderAsync(token, body, "not-a-uuid");

        first.StatusCode.Should().Be(HttpStatusCode.Created);
        second.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(secondBody).GetProperty("id").GetGuid().Should().Be(CatalogApi.Data(firstBody).GetProperty("id").GetGuid());
        other.StatusCode.Should().Be(HttpStatusCode.Created);
        bad.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(badBody).Should().Be("validation_error");
        await using var context = _postgres.CreateContext();
        (await context.Orders.CountAsync(order => order.CustomerId == customerId)).Should().Be(2);
    }

    [Fact]
    public async Task FreeOrderIsPaidAtOnceAndSmallOrderIsRefused()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var free = await _api.SeedServiceAsync(CatalogApi.NewTag() + " tư vấn", price: 0);
        var cheap = await _api.SeedServiceAsync(CatalogApi.NewTag() + " gội", price: 3_000);

        var (paid, body) = await _orders.CreateOrderAsync(token, new { source = "buy_now", spaServiceId = free.Id });
        paid.StatusCode.Should().Be(HttpStatusCode.Created);
        CatalogApi.Data(body).GetProperty("status").GetString().Should().Be("paid");
        CatalogApi.Data(body).GetProperty("payments").GetArrayLength().Should().Be(0);
        await using (var context = _postgres.CreateContext())
            (await context.ServiceEntitlements.CountAsync(row => row.CustomerId == customerId)).Should().Be(1);

        var (small, smallBody) = await _orders.CreateOrderAsync(token, new { source = "buy_now", spaServiceId = cheap.Id });
        small.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(smallBody).Should().Be("order_amount_too_small");
    }

    [Fact]
    public async Task PaymentAttemptCreatesPendingPaymentWithSignedUrl()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var (id, code, total) = await _orders.CreatePendingOrderAsync(token);

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{id}/payments", new { client = "web" }, token);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var data = CatalogApi.Data(body);
        data.GetProperty("paymentUrl").GetString().Should().Be($"https://pay.test/{code}01");
        await using var context = _postgres.CreateContext();
        var order = await context.Orders.SingleAsync(row => row.Id == id);
        var payment = await context.Payments.SingleAsync(row => row.OrderId == id);
        payment.Should().BeEquivalentTo(new { Provider = "vnpay", Amount = total, Status = PaymentStatus.Pending, RequestCode = code + "01" });
        payment.ExpiresAtUtc.Should().Be(order.PaymentDueAtUtc);
        _factory.Payments.Requests.Should().Contain(request => request.RequestCode == code + "01" && request.Amount == total);
    }

    [Fact]
    public async Task PaymentAttemptRejections()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var (stranger, _) = await _orders.LoginCustomerAsync();
        var (id, _, _) = await _orders.CreatePendingOrderAsync(token);

        var (foreign, foreignBody) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{id}/payments", new { }, stranger);
        foreign.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(foreignBody).Should().Be("order_not_found");

        for (var i = 0; i < 5; i++)
            (await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{id}/payments", new { }, token)).Response.StatusCode
                .Should().Be(HttpStatusCode.Created);
        var (sixth, sixthBody) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{id}/payments", new { }, token);
        sixth.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(sixthBody).Should().Be("payment_attempts_exceeded");

        var (paidId, _, _) = await _orders.CreatePendingOrderAsync(token);
        await using (var context = _postgres.CreateContext())
        {
            (await context.Orders.SingleAsync(row => row.Id == paidId)).Status = OrderStatus.Paid;
            await context.SaveChangesAsync();
        }
        var (paid, paidBody) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{paidId}/payments", new { }, token);
        paid.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(paidBody).Should().Be("order_not_payable");
    }

    [Fact]
    public async Task PaymentAttemptAfterDueTimeIsRefused()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var (id, _, _) = await _orders.CreatePendingOrderAsync(token);
        // The token was issued before the shift; JWT validation uses real time, the API uses the shifted clock.
        _factory.Clock.Offset = TimeSpan.FromMinutes(16);

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{id}/payments", new { }, token);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(body).Should().Be("order_not_payable");
        var (_, detail) = await _api.GetAsync($"/api/v1/me/orders/{id}", token);
        CatalogApi.Data(detail).GetProperty("isPayable").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task LastPromotionUseGoesToOneOrder()
    {
        var promotion = await _orders.SeedPromotionAsync(usageLimit: 1);
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da", price: 300_000);
        var first = await _orders.LoginCustomerAsync();
        var second = await _orders.LoginCustomerAsync();
        var body = new { source = "buy_now", spaServiceId = service.Id, promotionCode = promotion.Code };

        var results = await Task.WhenAll(_orders.CreateOrderAsync(first.Token, body), _orders.CreateOrderAsync(second.Token, body));

        results.Select(result => result.Response.StatusCode).Should().BeEquivalentTo([HttpStatusCode.Created, HttpStatusCode.BadRequest]);
        CatalogApi.ErrorCode(results.Single(result => result.Response.StatusCode == HttpStatusCode.BadRequest).Body)
            .Should().Be("promotion_not_applicable");
        await using var context = _postgres.CreateContext();
        (await context.PromotionRedemptions.CountAsync(row => row.PromotionId == promotion.Id)).Should().Be(1);
    }

    [Fact]
    public async Task OrderEndpointsAreForCustomers()
    {
        var staff = await _api.LoginAsync(UserRole.Staff);
        var owner = await _api.LoginAsync(UserRole.Owner);

        (await _orders.CreateOrderAsync(staff, new { source = "cart" })).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _api.GetAsync($"/api/v1/me/orders/{Guid.NewGuid()}", owner)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _api.GetAsync($"/api/v1/me/orders/{Guid.NewGuid()}")).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task MissingVnpayConfigOnlyBlocksPaymentAttempts()
    {
        await using var factory = new AuthApiFactory(_postgres.ConnectionString, useRealPaymentGateway: true);
        var api = new CatalogApi(factory, _postgres);
        var orders = new OrderApi(factory, _postgres, api);
        var (token, _) = await orders.LoginCustomerAsync();
        (await api.GetAsync("/health/live")).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        var (id, _, _) = await orders.CreatePendingOrderAsync(token);

        var (response, body) = await api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{id}/payments", new { }, token);

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        CatalogApi.ErrorCode(body).Should().Be("payment_gateway_unavailable");
        api.Client.Dispose();
    }
}
