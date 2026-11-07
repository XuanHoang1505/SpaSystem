using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NhuNguyetSpa.Application.Interfaces.Services.Payments;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Orders;

/// <summary>Gateway results through IPN and return URL (docs/specs/orders.md ORD-T16–T22, T27; UAT-13, 14, 15).</summary>
[Collection(PostgresCollection.Name)]
public sealed class PaymentCallbackTests : IAsyncLifetime
{
    private const string Ipn = "/api/v1/payments/vnpay/ipn";
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private OrderApi _orders = null!;
    private HttpClient _browser = null!;

    public PaymentCallbackTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CatalogApi(_factory, _postgres);
        _orders = new OrderApi(_factory, _postgres, _api);
        _browser = _factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _browser.Dispose();
        _api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private async Task<string> AttemptAsync(string token, Guid orderId)
    {
        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{orderId}/payments", new { client = "web" }, token);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return CatalogApi.Data(body).GetProperty("paymentUrl").GetString()!.Split('/')[^1];
    }

    private async Task<string> IpnAsync(string requestCode, decimal amount, bool success = true, bool validSignature = true)
    {
        var response = await _browser.GetAsync($"{Ipn}?{FakePaymentGateway.Query(requestCode, amount, success, validSignature)}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("Message").GetString().Should().NotBeNullOrEmpty();
        return json.RootElement.GetProperty("RspCode").GetString()!;
    }

    private Task<HttpResponseMessage> ReturnAsync(string client, string requestCode, decimal amount, bool success = true, bool validSignature = true) =>
        _browser.GetAsync($"/api/v1/payments/vnpay/return/{client}?{FakePaymentGateway.Query(requestCode, amount, success, validSignature)}");

    private async Task<(OrderStatus Order, string Payments, int Entitlements, int Packages)> StateAsync(Guid orderId)
    {
        await using var context = _postgres.CreateContext();
        var order = await context.Orders.Include(row => row.Payments).Include(row => row.Items).SingleAsync(row => row.Id == orderId);
        var itemIds = order.Items.Select(item => item.Id).ToList();
        return (order.Status,
            string.Join(",", order.Payments.OrderBy(payment => payment.RequestCode).Select(payment => payment.Status)),
            await context.ServiceEntitlements.CountAsync(row => itemIds.Contains(row.OrderItemId)),
            await context.CustomerPackages.CountAsync(row => itemIds.Contains(row.OrderItemId)));
    }

    [Fact]
    public async Task SuccessfulIpnPaysOrderIssuesEntitlementsAndEmptiesCart()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var facial = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da", price: 300_000);
        var massage = await _api.SeedServiceAsync(CatalogApi.NewTag() + " massage", price: 200_000);
        // SeedPackageAsync gives the first service 1 session and the second 2 sessions.
        var package = await _api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [facial, massage], price: 1_500_000);
        await _orders.AddToCartAsync(token, facial.Id);
        await _orders.AddToCartAsync(token, servicePackageId: package.Id);
        var (_, created) = await _orders.CreateOrderAsync(token, new { source = "cart" });
        var orderId = CatalogApi.Data(created).GetProperty("id").GetGuid();
        var requestCode = await AttemptAsync(token, orderId);

        (await IpnAsync(requestCode, 1_800_000)).Should().Be("00");

        (await StateAsync(orderId)).Should().Be((OrderStatus.Paid, "Succeeded", 1, 1));
        await using var context = _postgres.CreateContext();
        var payment = await context.Payments.SingleAsync(row => row.OrderId == orderId);
        payment.PaidAtUtc.Should().NotBeNull();
        payment.ProviderTransactionId.Should().Be("TXN" + requestCode);
        var bought = await context.CustomerPackages.SingleAsync(row => row.CustomerId == customerId);
        bought.TotalSessions.Should().Be(3);
        bought.ExpiresAtUtc.Should().Be(payment.PaidAtUtc!.Value.AddDays(90));
        var plan = await context.TreatmentPlans.Include(row => row.Sessions).SingleAsync(row => row.CustomerPackageId == bought.Id);
        plan.Status.Should().Be(TreatmentPlanStatus.NotStarted);
        plan.Sessions.OrderBy(session => session.SequenceNumber).Select(session => session.SpaServiceId)
            .Should().Equal(facial.Id, massage.Id, massage.Id);
        (await context.CartItems.CountAsync(item => item.Cart.CustomerId == customerId)).Should().Be(0);
    }

    [Fact]
    public async Task RepeatedResultsAreIdempotent()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var (orderId, _, total) = await _orders.CreatePendingOrderAsync(token);
        var requestCode = await AttemptAsync(token, orderId);

        (await IpnAsync(requestCode, total)).Should().Be("00");
        (await IpnAsync(requestCode, total)).Should().Be("02");
        var back = await ReturnAsync("web", requestCode, total);

        back.StatusCode.Should().Be(HttpStatusCode.Redirect);
        back.Headers.Location!.ToString().Should().Be($"{AuthApiFactory.WebResultPage}?orderId={orderId}");
        (await StateAsync(orderId)).Entitlements.Should().Be(1);
        await using var context = _postgres.CreateContext();
        (await context.ServiceEntitlements.CountAsync(row => row.CustomerId == customerId)).Should().Be(1);
    }

    [Fact]
    public async Task UntrustedResultsChangeNothing()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var (orderId, _, total) = await _orders.CreatePendingOrderAsync(token);
        var requestCode = await AttemptAsync(token, orderId);

        (await IpnAsync(requestCode, total, validSignature: false)).Should().Be("97");
        (await IpnAsync(requestCode, total - 1)).Should().Be("04");
        (await IpnAsync("DH000000XXXXXX01", total)).Should().Be("01");

        (await StateAsync(orderId)).Should().Be((OrderStatus.PendingPayment, "Pending", 0, 0));
    }

    [Fact]
    public async Task FailedPaymentCanBeRetried()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var (orderId, code, total) = await _orders.CreatePendingOrderAsync(token);
        var first = await AttemptAsync(token, orderId);

        (await IpnAsync(first, total, success: false)).Should().Be("00");
        (await StateAsync(orderId)).Should().Be((OrderStatus.PendingPayment, "Failed", 0, 0));
        var (_, detail) = await _api.GetAsync($"/api/v1/me/orders/{orderId}", token);
        CatalogApi.Data(detail).GetProperty("isPayable").GetBoolean().Should().BeTrue();

        var second = await AttemptAsync(token, orderId);
        second.Should().Be(code + "02");
        (await IpnAsync(second, total)).Should().Be("00");

        (await StateAsync(orderId)).Should().Be((OrderStatus.Paid, "Failed,Succeeded", 1, 0));
    }

    [Fact]
    public async Task SecondSuccessfulAttemptDoesNotIssueTwice()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var (orderId, _, total) = await _orders.CreatePendingOrderAsync(token);
        var first = await AttemptAsync(token, orderId);
        var second = await AttemptAsync(token, orderId);

        (await IpnAsync(first, total)).Should().Be("00");
        (await IpnAsync(second, total)).Should().Be("00");

        (await StateAsync(orderId)).Should().Be((OrderStatus.Paid, "Succeeded,Succeeded", 1, 0));
    }

    [Fact]
    public async Task ReturnUrlWithBadInputOrUnknownClient()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var (orderId, _, total) = await _orders.CreatePendingOrderAsync(token);
        var requestCode = await AttemptAsync(token, orderId);

        var bad = await ReturnAsync("web", requestCode, total, validSignature: false);
        bad.StatusCode.Should().Be(HttpStatusCode.Redirect);
        bad.Headers.Location!.ToString().Should().Be($"{AuthApiFactory.WebResultPage}?error=invalid_payment_result");
        (await ReturnAsync("desktop", requestCode, total)).StatusCode.Should().Be(HttpStatusCode.NotFound);

        (await StateAsync(orderId)).Order.Should().Be(OrderStatus.PendingPayment);
    }

    [Fact]
    public async Task ReturnUrlOnlyRedirectsWhenProcessingIsOff()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var (orderId, _, total) = await _orders.CreatePendingOrderAsync(token);
        var requestCode = await AttemptAsync(token, orderId);
        _factory.Payments.ProcessesReturnUrl = false;

        var back = await ReturnAsync("web", requestCode, total);

        back.Headers.Location!.ToString().Should().Be($"{AuthApiFactory.WebResultPage}?orderId={orderId}");
        (await StateAsync(orderId)).Should().Be((OrderStatus.PendingPayment, "Pending", 0, 0));
    }

    [Fact]
    public async Task LateSuccessRevivesExpiredOrder()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var (orderId, _, total) = await _orders.CreatePendingOrderAsync(token);
        var requestCode = await AttemptAsync(token, orderId);
        _factory.Clock.Offset = TimeSpan.FromMinutes(21);
        using (var scope = _factory.Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<IOrderExpiryService>().ExpireOverdueAsync(CancellationToken.None);
        (await StateAsync(orderId)).Should().Be((OrderStatus.Expired, "Expired", 0, 0));

        (await IpnAsync(requestCode, total)).Should().Be("00");

        (await StateAsync(orderId)).Should().Be((OrderStatus.Paid, "Succeeded", 1, 0));
    }

    [Fact]
    public async Task ConcurrentIpnAndReturnIssueOnce()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var (orderId, _, total) = await _orders.CreatePendingOrderAsync(token);
        var requestCode = await AttemptAsync(token, orderId);

        var ipnTask = IpnAsync(requestCode, total);
        var backTask = ReturnAsync("web", requestCode, total);
        await Task.WhenAll(ipnTask, backTask);
        var ipn = await ipnTask;
        var back = await backTask;

        new[] { "00", "02" }.Should().Contain(ipn);
        back.StatusCode.Should().Be(HttpStatusCode.Redirect);
        (await StateAsync(orderId)).Should().Be((OrderStatus.Paid, "Succeeded", 1, 0));
    }
}
