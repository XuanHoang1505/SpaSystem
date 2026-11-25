using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NhuNguyetSpa.Application.Interfaces.Services.Notifications;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Orders;

/// <summary>Paying a package in installments (docs/specs/order-installments.md, INS-T03…T23), VNPay replaced by FakePaymentGateway.</summary>
[Collection(PostgresCollection.Name)]
public sealed class InstallmentOrderTests : IAsyncLifetime
{
    private const string Ipn = "/api/v1/payments/vnpay/ipn";
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private OrderApi _orders = null!;
    private HttpClient _browser = null!;

    public InstallmentOrderTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString,
            settings: new Dictionary<string, string?> { ["Notifications:ReminderJob:Enabled"] = "false" });
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

    [Fact]
    public async Task PreviewOffersPlansSharedByListPriceAfterThePromotion()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var package = await SeedPackageAsync();
        var promotion = await _orders.SeedPromotionAsync(value: 10);

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/me/orders/preview",
            new { source = "buy_now", servicePackageId = package.Id, promotionCode = promotion.Code }, token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("grandTotal").GetDecimal().Should().Be(3_150_000);
        data.GetProperty("installmentUnavailableReason").ValueKind.Should().Be(JsonValueKind.Null);
        var options = data.GetProperty("installmentOptions").EnumerateArray().ToList();
        options.Select(option => option.GetProperty("installmentCount").GetInt32()).Should().Equal(2, 3);
        var three = options[1].GetProperty("installments").EnumerateArray().ToList();
        three.Select(item => item.GetProperty("amount").GetDecimal()).Should().Equal(1_500_000, 975_000, 675_000);
        three.Select(item => $"{item.GetProperty("firstSessionNumber").GetInt32()}-{item.GetProperty("lastSessionNumber").GetInt32()}")
            .Should().Equal("1-4", "5-7", "8-10");
        var services = three[1].GetProperty("services").EnumerateArray()
            .Select(item => $"{item.GetProperty("name").GetString()}×{item.GetProperty("sessionCount").GetInt32()}").ToList();
        services.Should().HaveCount(2);
        services[0].Should().EndWith("×2");
        services[1].Should().EndWith("×1");
        await using var context = _postgres.CreateContext();
        (await context.Orders.CountAsync(order => order.CustomerId == CustomerOf(token))).Should().Be(0);
    }

    [Fact]
    public async Task OrdersThatCannotBePaidInInstallmentsSayWhy()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " lẻ", price: 2_000_000);
        var cheap = await SeedPackageAsync(price: 500_000);

        foreach (var request in new object[]
                 {
                     new { source = "buy_now", spaServiceId = service.Id },
                     new { source = "buy_now", servicePackageId = cheap.Id },
                 })
        {
            var (_, preview) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/me/orders/preview", request, token);
            var data = CatalogApi.Data(preview);
            data.GetProperty("installmentOptions").GetArrayLength().Should().Be(0);
            data.GetProperty("installmentUnavailableReason").GetProperty("code").GetString().Should().Be("installment_not_available");
        }

        var (refused, body) = await _orders.CreateOrderAsync(token, new { source = "buy_now", servicePackageId = cheap.Id, installmentCount = 2 });
        refused.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        Code(body).Should().Be("installment_not_available");

        var package = await SeedPackageAsync();
        var (tooMany, tooManyBody) = await _orders.CreateOrderAsync(token, new { source = "buy_now", servicePackageId = package.Id, installmentCount = 4 });
        tooMany.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        Code(tooManyBody).Should().Be("installment_not_available");
    }

    [Fact]
    public async Task FullPaymentStaysAsBefore()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var package = await SeedPackageAsync();

        var (response, body) = await _orders.CreateOrderAsync(token, new { source = "buy_now", servicePackageId = package.Id });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var data = CatalogApi.Data(body);
        data.GetProperty("paymentPlan").GetString().Should().Be("full");
        data.GetProperty("installments").GetArrayLength().Should().Be(0);
        var (_, attempt) = await PayAsync(token, data.GetProperty("id").GetGuid());
        attempt.GetProperty("amount").GetDecimal().Should().Be(3_500_000);
        attempt.GetProperty("installmentSequenceNumber").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task InstallmentsUnlockSessionsUntilTheOrderIsPaid()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var package = await SeedPackageAsync();
        await _orders.AddToCartAsync(token, servicePackageId: package.Id);

        var (created, createdBody) = await _orders.CreateOrderAsync(token, new { source = "cart", installmentCount = 3 });
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var order = CatalogApi.Data(createdBody);
        var orderId = order.GetProperty("id").GetGuid();
        order.GetProperty("paymentPlan").GetString().Should().Be("installment");
        order.GetProperty("installments").EnumerateArray().Select(item => item.GetProperty("status").GetString())
            .Should().Equal("pending", "pending", "pending");
        order.GetProperty("nextInstallment").GetProperty("amount").GetDecimal().Should().Be(1_666_000);

        // First installment: the package is issued and sessions 1–4 open.
        var (code1, attempt1) = await PayAsync(token, orderId);
        attempt1.GetProperty("amount").GetDecimal().Should().Be(1_666_000);
        attempt1.GetProperty("installmentSequenceNumber").GetInt32().Should().Be(1);
        (await IpnAsync(code1, 1_666_000)).Should().Be("00");

        var detail = await OrderAsync(token, orderId);
        detail.GetProperty("status").GetString().Should().Be("partially_paid");
        detail.GetProperty("paidAmount").GetDecimal().Should().Be(1_666_000);
        detail.GetProperty("remainingAmount").GetDecimal().Should().Be(1_834_000);
        detail.GetProperty("isPayable").GetBoolean().Should().BeTrue();
        detail.GetProperty("canCancel").GetBoolean().Should().BeFalse();
        detail.GetProperty("nextInstallment").GetProperty("sequenceNumber").GetInt32().Should().Be(2);
        await using (var context = _postgres.CreateContext())
        {
            (await context.CartItems.AnyAsync(item => item.Cart.CustomerId == customerId)).Should().BeFalse();
            (await context.Notifications.Where(item => item.UserId == customerId).Select(item => item.Title).ToListAsync())
                .Should().Contain("Đã thanh toán đợt 1/3");
        }

        var plan = await PlanAsync(token);
        Session(plan, 4).GetProperty("canBook").GetBoolean().Should().BeFalse("session 1 is not booked yet");
        Session(plan, 5).GetProperty("reason").GetString().Should().Be("Buổi này thuộc đợt thanh toán chưa trả.");
        Session(plan, 1).GetProperty("canBook").GetBoolean().Should().BeTrue();
        var payment = plan.GetProperty("payment");
        payment.GetProperty("plan").GetString().Should().Be("installment");
        payment.GetProperty("paidSessionCount").GetInt32().Should().Be(4);
        payment.GetProperty("nextInstallment").GetProperty("orderId").GetGuid().Should().Be(orderId);
        var (_, purchases) = await _api.GetAsync("/api/v1/me/purchases?type=package", token);
        CatalogApi.Data(purchases).GetProperty("packages")[0].GetProperty("payment").GetProperty("paidSessionCount").GetInt32().Should().Be(4);

        // A wrong amount (the whole order) changes nothing.
        var (code2, attempt2) = await PayAsync(token, orderId);
        var later = attempt2.GetProperty("expiresAtUtc").GetDateTime().ToUniversalTime();
        later.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(15), TimeSpan.FromMinutes(2));
        (await IpnAsync(code2, 3_500_000)).Should().Be("04");
        (await IpnAsync(code2, attempt2.GetProperty("amount").GetDecimal())).Should().Be("00");
        (await IpnAsync(code2, attempt2.GetProperty("amount").GetDecimal())).Should().Be("02");
        Session(await PlanAsync(token), 7).GetProperty("reason").GetString().Should().NotBe("Buổi này thuộc đợt thanh toán chưa trả.");
        Session(await PlanAsync(token), 8).GetProperty("reason").GetString().Should().Be("Buổi này thuộc đợt thanh toán chưa trả.");

        var (code3, attempt3) = await PayAsync(token, orderId);
        (await IpnAsync(code3, attempt3.GetProperty("amount").GetDecimal())).Should().Be("00");
        detail = await OrderAsync(token, orderId);
        detail.GetProperty("status").GetString().Should().Be("paid");
        detail.GetProperty("remainingAmount").GetDecimal().Should().Be(0);
        detail.GetProperty("isPayable").GetBoolean().Should().BeFalse();
        detail.GetProperty("nextInstallment").ValueKind.Should().Be(JsonValueKind.Null);
        detail.GetProperty("payments").EnumerateArray().Select(item => item.GetProperty("installmentSequenceNumber").GetInt32())
            .Should().Equal(1, 2, 3);
        (await PlanAsync(token)).GetProperty("payment").GetProperty("nextInstallment").ValueKind.Should().Be(JsonValueKind.Null);

        var (_, list) = await _api.GetAsync("/api/v1/me/orders", token);
        var row = CatalogApi.Data(list).GetProperty("items")[0];
        row.GetProperty("paymentPlan").GetString().Should().Be("installment");
        row.GetProperty("paidAmount").GetDecimal().Should().Be(3_500_000);
    }

    [Fact]
    public async Task LateFirstInstallmentRevivesTheOrderAndAnExpiredPackageCannotBePaid()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var orderId = await CreateInstallmentOrderAsync(token, 2);
        var (code, attempt) = await PayAsync(token, orderId);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            _factory.Clock.Offset = TimeSpan.FromMinutes(30);
            await scope.ServiceProvider.GetRequiredService<NhuNguyetSpa.Application.Interfaces.Services.Payments.IOrderExpiryService>()
                .ExpireOverdueAsync(CancellationToken.None);
        }
        (await OrderAsync(token, orderId)).GetProperty("status").GetString().Should().Be("expired");
        (await IpnAsync(code, attempt.GetProperty("amount").GetDecimal())).Should().Be("00");
        (await OrderAsync(token, orderId)).GetProperty("status").GetString().Should().Be("partially_paid");

        _factory.Clock.Offset = TimeSpan.FromDays(91);
        var detail = await OrderAsync(token, orderId);
        detail.GetProperty("isPayable").GetBoolean().Should().BeFalse();
        detail.GetProperty("installments")[1].GetProperty("status").GetString().Should().Be("expired");
        var (refused, body) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{orderId}/payments", new { client = "web" }, token);
        refused.StatusCode.Should().Be(HttpStatusCode.Conflict);
        Code(body).Should().Be("order_not_payable");
    }

    [Fact]
    public async Task AnAbandonedLaterInstallmentAttemptExpiresAndStaysPayableLate()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var orderId = await CreateInstallmentOrderAsync(token, 2);
        var (code1, attempt1) = await PayAsync(token, orderId);
        (await IpnAsync(code1, attempt1.GetProperty("amount").GetDecimal())).Should().Be("00");
        var (code2, attempt2) = await PayAsync(token, orderId);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            _factory.Clock.Offset = TimeSpan.FromMinutes(30);
            await scope.ServiceProvider.GetRequiredService<NhuNguyetSpa.Application.Interfaces.Services.Payments.IOrderExpiryService>()
                .ExpireOverdueAsync(CancellationToken.None);
        }
        await using (var context = _postgres.CreateContext())
        {
            var order = await context.Orders.Include(item => item.Payments).SingleAsync(item => item.Id == orderId);
            order.Status.Should().Be(OrderStatus.PartiallyPaid);
            order.Payments.Single(item => item.RequestCode == code2).Status.Should().Be(PaymentStatus.Expired);
        }

        // Q-20: VNPay's result after the expiry still pays the installment.
        (await IpnAsync(code2, attempt2.GetProperty("amount").GetDecimal())).Should().Be("00");
        (await OrderAsync(token, orderId)).GetProperty("status").GetString().Should().Be("paid");
    }

    [Fact]
    public async Task OwnerCancellingThePlanCancelsTheInstallmentsLeft()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var orderId = await CreateInstallmentOrderAsync(token, 3);
        var (code, attempt) = await PayAsync(token, orderId);
        (await IpnAsync(code, attempt.GetProperty("amount").GetDecimal())).Should().Be("00");
        var planId = (await PlanAsync(token)).GetProperty("id").GetGuid();
        var owner = await _api.LoginAsync(UserRole.Owner);

        var (cancelled, _) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/treatments/{planId}/cancel", new { reason = "Khách dừng" }, owner);

        cancelled.StatusCode.Should().Be(HttpStatusCode.OK);
        var (_, ownerBody) = await _api.GetAsync($"/api/v1/orders/{orderId}", owner);
        var detail = CatalogApi.Data(ownerBody);
        detail.GetProperty("status").GetString().Should().Be("partially_paid");
        detail.GetProperty("installments").EnumerateArray().Select(item => item.GetProperty("status").GetString())
            .Should().Equal("paid", "cancelled", "cancelled");
        detail.GetProperty("canCancel").GetBoolean().Should().BeFalse();
        var (refused, body) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{orderId}/payments", new { client = "web" }, token);
        refused.StatusCode.Should().Be(HttpStatusCode.Conflict);
        Code(body).Should().Be("order_not_payable");
        var (notCancellable, cancelBody) = await _orders.CancelAsync(token, orderId);
        notCancellable.StatusCode.Should().Be(HttpStatusCode.Conflict);
        Code(cancelBody).Should().Be("order_not_cancellable");
    }

    [Fact]
    public async Task CancellingAPendingInstallmentOrderCancelsItsInstallments()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var orderId = await CreateInstallmentOrderAsync(token, 2);

        var (response, body) = await _orders.CancelAsync(token, orderId);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(body).GetProperty("installments").EnumerateArray().Select(item => item.GetProperty("status").GetString())
            .Should().Equal("cancelled", "cancelled");
    }

    [Fact]
    public async Task ExpiryReminderIsSentOnceWhileAnInstallmentIsLeft()
    {
        var (token, customerId) = await _orders.LoginCustomerAsync();
        var orderId = await CreateInstallmentOrderAsync(token, 2);
        var (code, attempt) = await PayAsync(token, orderId);
        (await IpnAsync(code, attempt.GetProperty("amount").GetDecimal())).Should().Be("00");

        _factory.Clock.Offset = TimeSpan.FromDays(85);
        for (var run = 0; run < 2; run++)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<IInstallmentReminderService>().SendDueAsync(CancellationToken.None);
        }

        await using var context = _postgres.CreateContext();
        (await context.Notifications.CountAsync(item => item.UserId == customerId && item.Title == "Gói sắp hết hạn, còn đợt chưa thanh toán"))
            .Should().Be(1);
    }

    [Fact]
    public async Task RevenueCountsEachInstallmentInItsOwnMonth()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var orderId = await CreateInstallmentOrderAsync(token, 2);
        var (code1, attempt1) = await PayAsync(token, orderId);
        (await IpnAsync(code1, attempt1.GetProperty("amount").GetDecimal())).Should().Be("00");
        var (code2, attempt2) = await PayAsync(token, orderId);
        (await IpnAsync(code2, attempt2.GetProperty("amount").GetDecimal())).Should().Be("00");
        await using (var context = _postgres.CreateContext())
        {
            // Report tests use their own far-future year so the shared database does not mix in other tests.
            var payments = await context.Payments.Where(payment => payment.OrderId == orderId).OrderBy(payment => payment.RequestCode).ToListAsync();
            payments[0].PaidAtUtc = new DateTime(2061, 1, 10, 3, 0, 0, DateTimeKind.Utc);
            payments[1].PaidAtUtc = new DateTime(2061, 2, 10, 3, 0, 0, DateTimeKind.Utc);
            await context.SaveChangesAsync();
        }
        var owner = await _api.LoginAsync(UserRole.Owner);

        var (_, body) = await _api.GetAsync("/api/v1/reports/revenue?fromDate=2061-01-01&toDate=2061-12-31&groupBy=month", owner);
        var (_, products) = await _api.GetAsync("/api/v1/reports/revenue/by-product?fromDate=2061-01-01&toDate=2061-12-31", owner);

        var data = CatalogApi.Data(body);
        var periods = data.GetProperty("periods").EnumerateArray().ToList();
        periods[0].GetProperty("revenue").GetDecimal().Should().Be(attempt1.GetProperty("amount").GetDecimal());
        periods[1].GetProperty("revenue").GetDecimal().Should().Be(attempt2.GetProperty("amount").GetDecimal());
        data.GetProperty("totalRevenue").GetDecimal().Should().Be(3_500_000);
        data.GetProperty("packageRevenue").GetDecimal().Should().Be(3_500_000);
        var item = CatalogApi.Data(products).GetProperty("items")[0];
        item.GetProperty("revenue").GetDecimal().Should().Be(3_500_000);
        item.GetProperty("quantity").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task PartiallyPaidOrdersKeepTheirPromotionUse()
    {
        var (token, _) = await _orders.LoginCustomerAsync();
        var promotion = await _orders.SeedPromotionAsync(value: 10, usageLimit: 1);
        var package = await SeedPackageAsync();
        var (created, body) = await _orders.CreateOrderAsync(token,
            new { source = "buy_now", servicePackageId = package.Id, promotionCode = promotion.Code, installmentCount = 2 });
        var orderId = CatalogApi.Data(body).GetProperty("id").GetGuid();
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var (code, attempt) = await PayAsync(token, orderId);
        (await IpnAsync(code, attempt.GetProperty("amount").GetDecimal())).Should().Be("00");
        // Signed in before moving the clock: tokens are issued at the test clock's time.
        var (other, _) = await _orders.LoginCustomerAsync();
        _factory.Clock.Offset = TimeSpan.FromMinutes(30);
        var (refused, refusedBody) = await _orders.CreateOrderAsync(other,
            new { source = "buy_now", servicePackageId = package.Id, promotionCode = promotion.Code });

        refused.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        Code(refusedBody).Should().Be("promotion_not_applicable");
    }

    private async Task<Guid> CreateInstallmentOrderAsync(string token, int installments)
    {
        var package = await SeedPackageAsync();
        var (response, body) = await _orders.CreateOrderAsync(token, new { source = "buy_now", servicePackageId = package.Id, installmentCount = installments });
        response.StatusCode.Should().Be(HttpStatusCode.Created, body.RootElement.ToString());
        return CatalogApi.Data(body).GetProperty("id").GetGuid();
    }

    /// <summary>6 facials at 500 000 then 4 massages at 300 000 (the spec example), 90 days of validity.</summary>
    private async Task<ServicePackage> SeedPackageAsync(decimal price = 3_500_000)
    {
        var facial = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da", price: 500_000);
        var massage = await _api.SeedServiceAsync(CatalogApi.NewTag() + " massage", price: 300_000);
        await using var context = _postgres.CreateContext();
        var package = new ServicePackage { Name = CatalogApi.NewTag() + " gói 10 buổi", Price = price, ValidityDays = 90 };
        package.ChangeStatus(CatalogStatus.OnSale);
        package.ReplaceItems(
        [
            new ServicePackageItem { ServicePackageId = package.Id, SpaServiceId = facial.Id, SessionCount = 6, SortOrder = 1, MinDaysBetweenSessions = 0 },
            new ServicePackageItem { ServicePackageId = package.Id, SpaServiceId = massage.Id, SessionCount = 4, SortOrder = 2, MinDaysBetweenSessions = 0 },
        ]);
        context.ServicePackages.Add(package);
        await context.SaveChangesAsync();
        return package;
    }

    private async Task<(string RequestCode, JsonElement Attempt)> PayAsync(string token, Guid orderId)
    {
        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{orderId}/payments", new { client = "web" }, token);
        response.StatusCode.Should().Be(HttpStatusCode.Created, body.RootElement.ToString());
        var data = CatalogApi.Data(body).Clone();
        return (data.GetProperty("paymentUrl").GetString()!.Split('/')[^1], data);
    }

    private async Task<string> IpnAsync(string requestCode, decimal amount)
    {
        var response = await _browser.GetAsync($"{Ipn}?{FakePaymentGateway.Query(requestCode, amount)}");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("RspCode").GetString()!;
    }

    private async Task<JsonElement> OrderAsync(string token, Guid orderId)
    {
        var (_, body) = await _api.GetAsync($"/api/v1/me/orders/{orderId}", token);
        return CatalogApi.Data(body).Clone();
    }

    /// <summary>The customer's only treatment plan, in detail.</summary>
    private async Task<JsonElement> PlanAsync(string token)
    {
        var (_, list) = await _api.GetAsync("/api/v1/me/treatments", token);
        var id = CatalogApi.Data(list)[0].GetProperty("id").GetGuid();
        var (_, body) = await _api.GetAsync($"/api/v1/me/treatments/{id}", token);
        return CatalogApi.Data(body).Clone();
    }

    private static JsonElement Session(JsonElement plan, int sequenceNumber) =>
        plan.GetProperty("sessions").EnumerateArray().Single(session => session.GetProperty("sequenceNumber").GetInt32() == sequenceNumber);

    private static Guid CustomerOf(string token)
    {
        var payload = token.Split('.')[1];
        var json = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=')
            .Replace('-', '+').Replace('_', '/')));
        return JsonDocument.Parse(json).RootElement.GetProperty("sub").GetGuid();
    }

    private static string Code(JsonDocument body) => body.RootElement.GetProperty("errors")[0].GetProperty("code").GetString()!;
}
