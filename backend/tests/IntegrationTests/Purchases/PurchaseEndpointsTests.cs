using System.Net;
using System.Text.Json;
using FluentAssertions;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Bookings;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Bookings.BookingApi;

namespace NhuNguyetSpa.IntegrationTests.Purchases;

/// <summary>UC-SPA-18 over HTTP (docs/specs/purchases-treatments.md TRT-T01..T03, T06, T08..T10).</summary>
[Collection(PostgresCollection.Name)]
public sealed class PurchaseEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CustomerBookingApi _api = null!;

    public PurchaseEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    private static DateOnly Day => CustomerBookingApi.Day;

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

    private static JsonElement Data(JsonDocument body) => CatalogApi.Data(body);

    [Fact]
    public async Task ListsServicesAndPackagesWithProgress()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var now = DateTime.UtcNow;
        var (available, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service, orderCreatedAtUtc: now.AddDays(-3));
        var (booked, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service, EntitlementStatus.Booked, orderCreatedAtUtc: now.AddDays(-2));
        var appointment = await _api.Purchases.SeedEntitlementAppointmentAsync(booked, staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed);
        var other = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " B");
        var third = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " C");
        // Items: service × 1, other × 2, third × 3 → 6 sessions.
        var package = await _api.Api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service, other, third]);
        var bought = await _api.Purchases.SeedPackageAsync(customerId, package, [service, other, third],
            [TreatmentSessionStatus.Completed, TreatmentSessionStatus.Completed, TreatmentSessionStatus.Booked]);

        var (response, body) = await _api.Api.GetAsync("/api/v1/me/purchases", token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var services = Data(body).GetProperty("services").EnumerateArray().ToList();
        services.Select(row => row.GetProperty("id").GetGuid()).Should().Equal(booked.Id, available.Id);
        services[0].GetProperty("appointment").GetProperty("id").GetGuid().Should().Be(appointment.Id);
        services[0].GetProperty("canBook").GetBoolean().Should().BeFalse();
        services[1].GetProperty("canBook").GetBoolean().Should().BeTrue();
        services[1].GetProperty("status").GetString().Should().Be("available");
        var row = Data(body).GetProperty("packages").EnumerateArray().Single();
        row.GetProperty("id").GetGuid().Should().Be(bought.Package.Id);
        row.GetProperty("usedSessions").GetInt32().Should().Be(2);
        row.GetProperty("bookedSessions").GetInt32().Should().Be(1);
        row.GetProperty("totalSessions").GetInt32().Should().Be(6);
        row.GetProperty("treatmentPlan").GetProperty("id").GetGuid().Should().Be(bought.Plan.Id);
        row.GetProperty("nextSession").GetProperty("sequenceNumber").GetInt32().Should().Be(4);
        row.GetProperty("nextSession").GetProperty("canBook").GetBoolean().Should().BeTrue();
        row.GetProperty("items").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task EmptyWhenNothingBought()
    {
        var (token, _) = await _api.Booking.LoginCustomerAsync();

        var (response, body) = await _api.Api.GetAsync("/api/v1/me/purchases", token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        Data(body).GetProperty("services").GetArrayLength().Should().Be(0);
        Data(body).GetProperty("packages").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task OtherCustomersPurchasesAreHidden()
    {
        var service = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ");
        var (token, _) = await _api.Booking.LoginCustomerAsync();
        var (_, otherId) = await _api.Booking.LoginCustomerAsync();
        var (entitlement, _) = await _api.Purchases.SeedEntitlementAsync(otherId, service);
        var package = await _api.Api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service]);
        var bought = await _api.Purchases.SeedPackageAsync(otherId, package, [service]);

        var (_, list) = await _api.Api.GetAsync("/api/v1/me/purchases", token);
        var (serviceResponse, serviceBody) = await _api.Api.GetAsync($"/api/v1/me/purchases/services/{entitlement.Id}", token);
        var (packageResponse, packageBody) = await _api.Api.GetAsync($"/api/v1/me/purchases/packages/{bought.Package.Id}", token);

        Data(list).GetProperty("services").GetArrayLength().Should().Be(0);
        (serviceResponse.StatusCode, CatalogApi.ErrorCode(serviceBody)).Should().Be((HttpStatusCode.NotFound, "entitlement_not_found"));
        (packageResponse.StatusCode, CatalogApi.ErrorCode(packageBody)).Should().Be((HttpStatusCode.NotFound, "customer_package_not_found"));
    }

    [Fact]
    public async Task FiltersAndValidation()
    {
        var service = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ");
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        await _api.Purchases.SeedEntitlementAsync(customerId, service);
        await _api.Purchases.SeedEntitlementAsync(customerId, service, expiresAtUtc: DateTime.UtcNow.AddDays(-1));

        var (_, available) = await _api.Api.GetAsync("/api/v1/me/purchases?type=service&status=available", token);
        var (_, expired) = await _api.Api.GetAsync("/api/v1/me/purchases?type=service&status=expired", token);
        var (noType, _) = await _api.Api.GetAsync("/api/v1/me/purchases?status=used", token);
        var (wrongStatus, _) = await _api.Api.GetAsync("/api/v1/me/purchases?type=package&status=booked", token);

        Data(available).GetProperty("services").GetArrayLength().Should().Be(1);
        Data(expired).GetProperty("services").EnumerateArray().Single().GetProperty("status").GetString().Should().Be("expired");
        noType.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        wrongStatus.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task EarliestDateMatchesBookingRule()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var other = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " B");
        await _api.Booking.AddSkillAsync(staff.Id, other.Id);
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var package = await _api.Api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service, other]);
        var bought = await _api.Purchases.SeedPackageAsync(customerId, package, [service, other], [TreatmentSessionStatus.Booked]);
        await _api.Purchases.SeedSessionAppointmentAsync(bought.Sessions[0], customerId, staff.Id, Day, At(8), At(9), AppointmentStatus.Confirmed);

        var (_, body) = await _api.Api.GetAsync($"/api/v1/me/purchases/packages/{bought.Package.Id}", token);
        var next = Data(body).GetProperty("nextSession");
        var earliest = DateOnly.Parse(next.GetProperty("earliestDate").GetString()!);
        await _api.Booking.Staff.SeedShiftAsync(staff.Id, earliest.AddDays(-1), 8, 12);
        var (tooEarly, tooEarlyBody) = await _api.BookAsync(token, earliest.AddDays(-1), At(9), sessionId: next.GetProperty("id").GetGuid(), staffId: staff.Id);

        earliest.Should().Be(Day.AddDays(7));
        (tooEarly.StatusCode, CatalogApi.ErrorCode(tooEarlyBody)).Should().Be((HttpStatusCode.BadRequest, "session_too_early"));
    }

    [Fact]
    public async Task DetailsCarryItemsOrderAndPurchaseTime()
    {
        var service = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ");
        var other = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " B");
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var created = new DateTime(2026, 10, 20, 3, 0, 0, DateTimeKind.Utc);
        var (paid, paidOrder) = await _api.Purchases.SeedEntitlementAsync(customerId, service, orderCreatedAtUtc: created);
        var (free, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service, amount: 0, orderCreatedAtUtc: created);
        var package = await _api.Api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service, other]);
        var bought = await _api.Purchases.SeedPackageAsync(customerId, package, [service, other],
            [TreatmentSessionStatus.Completed, TreatmentSessionStatus.Booked]);

        var (_, paidBody) = await _api.Api.GetAsync($"/api/v1/me/purchases/services/{paid.Id}", token);
        var (_, freeBody) = await _api.Api.GetAsync($"/api/v1/me/purchases/services/{free.Id}", token);
        var (_, packageBody) = await _api.Api.GetAsync($"/api/v1/me/purchases/packages/{bought.Package.Id}", token);

        Data(paidBody).GetProperty("order").GetProperty("code").GetString().Should().Be(paidOrder.Code);
        Data(paidBody).GetProperty("purchasedAtUtc").GetDateTime().Should().Be(created.AddMinutes(2));
        Data(freeBody).GetProperty("purchasedAtUtc").GetDateTime().Should().Be(created);
        var items = Data(packageBody).GetProperty("items").EnumerateArray().ToList();
        items.Select(item => item.GetProperty("spaServiceId").GetGuid()).Should().Equal(service.Id, other.Id);
        items.Select(item => (item.GetProperty("totalSessions").GetInt32(), item.GetProperty("completedSessions").GetInt32(),
            item.GetProperty("bookedSessions").GetInt32())).Should().Equal((1, 1, 0), (2, 0, 1));
        Data(packageBody).GetProperty("order").GetProperty("code").GetString().Should().Be(bought.Order.Code);
    }

    [Fact]
    public async Task BookNowPurchaseShowsConfirmedAppointment()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, _) = await _api.Booking.LoginCustomerAsync();
        var (_, bookBody) = await _api.BookNowAsync(token, service.Id, Day, At(9), staff.Id);
        var order = Data(bookBody).GetProperty("order");
        await _api.PayAsync(token, order.GetProperty("id").GetGuid(), order.GetProperty("grandTotal").GetDecimal());

        var (_, body) = await _api.Api.GetAsync("/api/v1/me/purchases?type=service", token);

        var row = Data(body).GetProperty("services").EnumerateArray().Single();
        row.GetProperty("status").GetString().Should().Be("booked");
        row.GetProperty("appointment").GetProperty("status").GetString().Should().Be("confirmed");
    }

    [Fact]
    public async Task OnlyCustomersSeePurchases()
    {
        var owner = await _api.Api.LoginAsync(UserRole.Owner);
        var (staffToken, _) = await _api.Booking.LoginStaffAsync();

        (await _api.Api.GetAsync("/api/v1/me/purchases", owner)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _api.Api.GetAsync("/api/v1/me/purchases", staffToken)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _api.Api.GetAsync($"/api/v1/me/purchases/packages/{Guid.NewGuid()}")).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
