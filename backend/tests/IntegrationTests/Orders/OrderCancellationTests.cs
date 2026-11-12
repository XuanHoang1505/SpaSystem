using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Bookings;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Orders;

/// <summary>Customer cancel of an unpaid order (docs/specs/orders.md: BR-ORD-04, 05, 12, BR-PRM-03, ORD-T32…T38).</summary>
[Collection(PostgresCollection.Name)]
public sealed class OrderCancellationTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CustomerBookingApi _api = null!;

    public OrderCancellationTests(PostgresFixture postgres) => _postgres = postgres;

    private OrderApi Orders => _api.Orders;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CustomerBookingApi(_factory, _postgres);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _api.Dispose();
        _api.Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private async Task<Order> LoadAsync(Guid id)
    {
        await using var context = _postgres.CreateContext();
        return await context.Orders.AsNoTracking().Include(order => order.Payments).Include(order => order.Items).SingleAsync(order => order.Id == id);
    }

    [Fact]
    public async Task CustomerCancelsPendingOrder()
    {
        var (token, _) = await Orders.LoginCustomerAsync();
        var (orderId, _, total) = await Orders.CreatePendingOrderAsync(token);
        (await _api.IpnAsync(await _api.StartPaymentAsync(token, orderId), total, success: false)).Should().Be("00");
        var pendingCode = await _api.StartPaymentAsync(token, orderId);

        var (response, body) = await Orders.CancelAsync(token, orderId, "  đổi ý  ");

        response.StatusCode.Should().Be(HttpStatusCode.OK, body.RootElement.ToString());
        var data = CatalogApi.Data(body);
        data.GetProperty("status").GetString().Should().Be("cancelled");
        data.GetProperty("cancellationReason").GetString().Should().Be("đổi ý");
        data.GetProperty("cancelledAtUtc").GetDateTime().Should().BeCloseTo(_factory.Clock.UtcNow, TimeSpan.FromMinutes(1));
        data.GetProperty("isPayable").GetBoolean().Should().BeFalse();
        data.GetProperty("canCancel").GetBoolean().Should().BeFalse();
        var order = await LoadAsync(orderId);
        order.CancellationReason.Should().Be("đổi ý");
        order.Payments.Single(payment => payment.RequestCode == pendingCode).Status.Should().Be(PaymentStatus.Expired);
        order.Payments.Single(payment => payment.RequestCode != pendingCode).Status.Should().Be(PaymentStatus.Failed);
        var (retry, retryBody) = await _api.Api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{orderId}/payments", new { client = "web" }, token);
        retry.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(retryBody).Should().Be("order_not_payable");
    }

    [Fact]
    public async Task CancelBookNowFreesSlot()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, _) = await _api.Booking.LoginCustomerAsync();
        var (booked, bookedBody) = await _api.BookNowAsync(token, service.Id, CustomerBookingApi.Day, new TimeOnly(9, 0), staff.Id);
        booked.StatusCode.Should().Be(HttpStatusCode.Created, bookedBody.RootElement.ToString());
        var appointmentId = CatalogApi.Data(bookedBody).GetProperty("appointment").GetProperty("id").GetGuid();
        var order = CatalogApi.Data(bookedBody).GetProperty("order");
        (await SlotStartsAsync(service.Id)).Should().NotContain("09:00");

        var (response, body) = await Orders.CancelAsync(token, order.GetProperty("id").GetGuid(), "Bận việc");

        response.StatusCode.Should().Be(HttpStatusCode.OK, body.RootElement.ToString());
        CatalogApi.Data(body).GetProperty("appointment").GetProperty("status").GetString().Should().Be("cancelled");
        var appointment = await _api.Booking.LoadAsync(appointmentId);
        appointment.Status.Should().Be(AppointmentStatus.Cancelled);
        appointment.CancellationReason.Should().Be($"Hủy đơn hàng {order.GetProperty("code").GetString()}: Bận việc");
        (await SlotStartsAsync(service.Id)).Should().Contain("09:00");
    }

    private async Task<string[]> SlotStartsAsync(Guid serviceId)
    {
        var (_, body) = await _api.Api.GetAsync($"/api/v1/availability?spaServiceId={serviceId}&date={BookingApi.D(CustomerBookingApi.Day)}");
        return CatalogApi.Data(body).GetProperty("staff").EnumerateArray()
            .SelectMany(staff => staff.GetProperty("slots").EnumerateArray().Select(slot => slot.GetProperty("startTime").GetString()!))
            .ToArray();
    }

    [Theory]
    [InlineData(OrderStatus.Paid)]
    [InlineData(OrderStatus.Expired)]
    [InlineData(OrderStatus.Cancelled)]
    public async Task CannotCancelNonPending(OrderStatus status)
    {
        var (token, customerId) = await Orders.LoginCustomerAsync();
        var order = await Orders.SeedOrderAsync(customerId, status);

        var (response, body) = await Orders.CancelAsync(token, order.Id);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(body).Should().Be("order_not_cancellable");
        (await LoadAsync(order.Id)).Status.Should().Be(status);
    }

    [Fact]
    public async Task OtherCustomersOrderNotFound()
    {
        var (token, _) = await Orders.LoginCustomerAsync();
        var order = await Orders.SeedOrderAsync(await Orders.SeedCustomerAsync(), OrderStatus.PendingPayment);

        var (response, body) = await Orders.CancelAsync(token, order.Id);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(body).Should().Be("order_not_found");
        (await LoadAsync(order.Id)).Status.Should().Be(OrderStatus.PendingPayment);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    [InlineData("501")]
    public async Task ReasonRequired(string? reason)
    {
        var (token, customerId) = await Orders.LoginCustomerAsync();
        var order = await Orders.SeedOrderAsync(customerId, OrderStatus.PendingPayment);

        var (response, body) = await Orders.CancelAsync(token, order.Id, reason == "501" ? new string('a', 501) : reason);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body.RootElement.GetProperty("errors")[0].GetProperty("field").GetString().Should().Be("Reason");
        (await LoadAsync(order.Id)).Status.Should().Be(OrderStatus.PendingPayment);
    }

    [Fact]
    public async Task CancelledOrderReleasesPromotionUse()
    {
        var promotion = await Orders.SeedPromotionAsync(usageLimit: 1);
        var service = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ", price: 500_000);
        var body = new { source = "buy_now", spaServiceId = service.Id, promotionCode = promotion.Code };
        var (first, _) = await Orders.LoginCustomerAsync();
        var (second, _) = await Orders.LoginCustomerAsync();
        var (created, createdBody) = await Orders.CreateOrderAsync(first, body);
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var (blocked, blockedBody) = await Orders.CreateOrderAsync(second, body);
        blocked.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(blockedBody).Should().Be("promotion_not_applicable");

        (await Orders.CancelAsync(first, CatalogApi.Data(createdBody).GetProperty("id").GetGuid())).Response.StatusCode.Should().Be(HttpStatusCode.OK);

        (await Orders.CreateOrderAsync(second, body)).Response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task LateIpnSuccessKeepsOrderCancelled()
    {
        var (token, _) = await Orders.LoginCustomerAsync();
        var (orderId, _, total) = await Orders.CreatePendingOrderAsync(token);
        var requestCode = await _api.StartPaymentAsync(token, orderId);
        (await Orders.CancelAsync(token, orderId)).Response.StatusCode.Should().Be(HttpStatusCode.OK);

        (await _api.IpnAsync(requestCode, total)).Should().Be("00");

        var order = await LoadAsync(orderId);
        order.Status.Should().Be(OrderStatus.Cancelled);
        order.Payments.Single().Status.Should().Be(PaymentStatus.Succeeded);
        await using var context = _postgres.CreateContext();
        (await context.ServiceEntitlements.CountAsync(row => row.OrderItemId == order.Items.Single().Id)).Should().Be(0);
    }

    [Fact]
    public async Task CancelAndIpnSuccessConcurrently_OneWins()
    {
        for (var round = 0; round < 5; round++)
        {
            var (token, _) = await Orders.LoginCustomerAsync();
            var (orderId, _, total) = await Orders.CreatePendingOrderAsync(token);
            var requestCode = await _api.StartPaymentAsync(token, orderId);

            var cancel = Orders.CancelAsync(token, orderId);
            var ipn = _api.IpnAsync(requestCode, total);
            await Task.WhenAll(cancel, ipn);
            var (cancelResponse, cancelBody) = await cancel;

            (await ipn).Should().Be("00");
            var order = await LoadAsync(orderId);
            await using var context = _postgres.CreateContext();
            var entitlements = await context.ServiceEntitlements.CountAsync(row => row.OrderItemId == order.Items.Single().Id);
            order.Payments.Single().Status.Should().Be(PaymentStatus.Succeeded);
            if (cancelResponse.StatusCode == HttpStatusCode.OK)
            {
                order.Status.Should().Be(OrderStatus.Cancelled);
                entitlements.Should().Be(0);
            }
            else
            {
                cancelResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
                CatalogApi.ErrorCode(cancelBody).Should().Be("order_not_cancellable");
                order.Status.Should().Be(OrderStatus.Paid);
                entitlements.Should().Be(1);
            }
        }
    }

    [Fact]
    public async Task PaymentStartBlocksCustomerCancel()
    {
        await using var blocking = _factory.WithWebHostBuilder(builder => builder.UseSetting("Order:CancelBlockMinutesAfterPaymentStart", "5"));
        using var client = blocking.CreateClient();
        var (token, _) = await Orders.LoginCustomerAsync();
        var ownerToken = await _api.Api.LoginAsync(UserRole.Owner);
        var (orderId, _, _) = await Orders.CreatePendingOrderAsync(token);
        var (ownerOrderId, _, _) = await Orders.CreatePendingOrderAsync(token);
        await _api.StartPaymentAsync(token, orderId);
        await _api.StartPaymentAsync(token, ownerOrderId);

        _factory.Clock.Offset = TimeSpan.FromMinutes(2);
        var (blocked, blockedBody) = await PostAsync(client, $"/api/v1/me/orders/{orderId}/cancel", token);
        var (owner, _) = await PostAsync(client, $"/api/v1/orders/{ownerOrderId}/cancel", ownerToken);
        _factory.Clock.Offset = TimeSpan.FromMinutes(6);
        var (allowed, _) = await PostAsync(client, $"/api/v1/me/orders/{orderId}/cancel", token);

        blocked.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(blockedBody).Should().Be("order_payment_in_progress");
        owner.StatusCode.Should().Be(HttpStatusCode.OK);
        allowed.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private static async Task<(HttpResponseMessage Response, JsonDocument Body)> PostAsync(HttpClient client, string path, string token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(new { reason = "Đổi ý" }) };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);
        return (response, JsonDocument.Parse(await response.Content.ReadAsStringAsync()));
    }
}
