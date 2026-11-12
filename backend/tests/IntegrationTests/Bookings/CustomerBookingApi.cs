using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Interfaces.Services.Payments;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Orders;
using NhuNguyetSpa.IntegrationTests.Purchases;

namespace NhuNguyetSpa.IntegrationTests.Bookings;

/// <summary>HTTP helpers for UC-SPA-15 customer bookings; seeds come from <see cref="BookingApi"/>, <see cref="OrderApi"/>, <see cref="PurchaseApi"/>.</summary>
public sealed class CustomerBookingApi : IDisposable
{
    private readonly AuthApiFactory _factory;
    private readonly HttpClient _browser;

    public CustomerBookingApi(AuthApiFactory factory, PostgresFixture postgres)
    {
        _factory = factory;
        Booking = new BookingApi(factory, postgres);
        Orders = new OrderApi(factory, postgres, Booking.Api);
        Purchases = new PurchaseApi(factory, postgres);
        _browser = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    }

    public BookingApi Booking { get; }
    public OrderApi Orders { get; }
    public PurchaseApi Purchases { get; }
    public CatalogApi Api => Booking.Api;

    /// <summary>Two days ahead in Vietnam, so every slot is in the future and past the book-now hold.</summary>
    public static DateOnly Day => SpaTime.Today(DateTime.UtcNow).AddDays(2);

    public static string T(TimeOnly time) => time.ToString("HH:mm");

    public void Dispose() => _browser.Dispose();

    public Task<(HttpResponseMessage Response, JsonDocument Body)> BookNowAsync(
        string? token, Guid serviceId, DateOnly date, TimeOnly start, Guid? staffId = null, string? promotionCode = null, string? idempotencyKey = null)
    {
        var content = JsonContent.Create(new { spaServiceId = serviceId, date = BookingApi.D(date), startTime = T(start), staffMemberId = staffId, promotionCode });
        if (idempotencyKey is not null)
            content.Headers.Add("Idempotency-Key", idempotencyKey);
        return Api.SendAsync(HttpMethod.Post, "/api/v1/me/appointments/book-now", content, token);
    }

    public Task<(HttpResponseMessage Response, JsonDocument Body)> BookAsync(
        string? token, DateOnly date, TimeOnly start, Guid? entitlementId = null, Guid? sessionId = null, Guid? staffId = null) =>
        Api.SendJsonAsync(HttpMethod.Post, "/api/v1/me/appointments",
            new { serviceEntitlementId = entitlementId, treatmentSessionId = sessionId, date = BookingApi.D(date), startTime = T(start), staffMemberId = staffId },
            token);

    public Task<(HttpResponseMessage Response, JsonDocument Body)> ListMineAsync(string? token, string query = "") =>
        Api.GetAsync("/api/v1/me/appointments" + (query.Length > 0 ? "?" + query : string.Empty), token);

    public Task<(HttpResponseMessage Response, JsonDocument Body)> GetMineAsync(string? token, Guid id) =>
        Api.GetAsync($"/api/v1/me/appointments/{id}", token);

    public Task<(HttpResponseMessage Response, JsonDocument Body)> RescheduleAsync(
        string? token, Guid id, DateOnly date, TimeOnly start, Guid? staffId = null) =>
        Api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/appointments/{id}/reschedule",
            new { date = BookingApi.D(date), startTime = T(start), staffMemberId = staffId }, token);

    public Task<(HttpResponseMessage Response, JsonDocument Body)> CancelAsync(string? token, Guid id, string? reason = "Bận việc đột xuất") =>
        Api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/appointments/{id}/cancel", new { reason }, token);

    /// <summary>Moves the test clock so that it is <paramref name="local"/> in Vietnam (log in before calling: JWTs are checked against real time).</summary>
    public void SetVietnamNow(DateTime local) => _factory.Clock.Offset = SpaTime.ToUtc(local) - DateTime.UtcNow;

    /// <summary>Starts a payment attempt for the order; returns its request code (the fake gateway URL ends with it).</summary>
    public async Task<string> StartPaymentAsync(string token, Guid orderId)
    {
        var (response, body) = await Api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{orderId}/payments", new { client = "web" }, token);
        if (response.StatusCode != HttpStatusCode.Created)
            throw new InvalidOperationException($"Payment attempt failed: {response.StatusCode} {body.RootElement}");
        return CatalogApi.Data(body).GetProperty("paymentUrl").GetString()!.Split('/')[^1];
    }

    /// <summary>Sends the fake gateway's IPN; returns the VNPay RspCode.</summary>
    public async Task<string> IpnAsync(string requestCode, decimal amount, bool success = true)
    {
        var ipn = await _browser.GetAsync($"/api/v1/payments/vnpay/ipn?{FakePaymentGateway.Query(requestCode, amount, success)}");
        using var json = JsonDocument.Parse(await ipn.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("RspCode").GetString()!;
    }

    public async Task<string> PayAsync(string token, Guid orderId, decimal amount, bool success = true) =>
        await IpnAsync(await StartPaymentAsync(token, orderId), amount, success);

    public async Task ExpireOrdersAsync()
    {
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<IOrderExpiryService>().ExpireOverdueAsync(CancellationToken.None);
    }

    /// <summary>A service on sale and one qualified staff member with an 08:00–12:00 shift on <see cref="Day"/>.</summary>
    public async Task<(SpaService Service, StaffMember Staff)> SeedServiceWithStaffAsync(string staffName = "An", decimal price = 300_000)
    {
        var service = await Api.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ", price: price);
        var staff = await Booking.SeedQualifiedStaffAsync(staffName + " " + CatalogApi.NewTag(), service.Id, (Day, 8, 12));
        return (service, staff);
    }
}
