using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Bookings.BookingApi;

namespace NhuNguyetSpa.IntegrationTests.Bookings;

/// <summary>UC-SPA-15 over HTTP (docs/specs/bookings.md BKG-T25..T32, T34..T39, T41, T43..T48).</summary>
[Collection(PostgresCollection.Name)]
public sealed class CustomerBookingEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CustomerBookingApi _api = null!;

    public CustomerBookingEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

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

    private async Task<Appointment> AppointmentAsync(Guid id)
    {
        await using var context = _postgres.CreateContext();
        return await context.Appointments.AsNoTracking().SingleAsync(row => row.Id == id);
    }

    private async Task<ServiceEntitlement> EntitlementOfLineAsync(Guid orderItemId)
    {
        await using var context = _postgres.CreateContext();
        return await context.ServiceEntitlements.AsNoTracking().SingleAsync(row => row.OrderItemId == orderItemId);
    }

    private async Task<OrderStatus> OrderStatusAsync(Guid id)
    {
        await using var context = _postgres.CreateContext();
        return (await context.Orders.AsNoTracking().SingleAsync(row => row.Id == id)).Status;
    }

    private async Task<string[]> SlotStartsAsync(Guid serviceId, string token)
    {
        var (_, body) = await _api.Api.GetAsync($"/api/v1/availability?spaServiceId={serviceId}&date={D(Day)}", token);
        return Data(body).GetProperty("staff").EnumerateArray()
            .SelectMany(staff => staff.GetProperty("slots").EnumerateArray().Select(slot => slot.GetProperty("startTime").GetString()!))
            .ToArray();
    }

    private async Task<(Guid AppointmentId, Guid OrderId, decimal Total)> BookNowOkAsync(string token, Guid serviceId, Guid? staffId, TimeOnly start)
    {
        var (response, body) = await _api.BookNowAsync(token, serviceId, Day, start, staffId);
        response.StatusCode.Should().Be(HttpStatusCode.Created, body.RootElement.ToString());
        var data = Data(body);
        return (data.GetProperty("appointment").GetProperty("id").GetGuid(), data.GetProperty("order").GetProperty("id").GetGuid(),
            data.GetProperty("order").GetProperty("grandTotal").GetDecimal());
    }

    [Fact]
    public async Task BookNowHoldsSlotAndCreatesOrder()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var (otherToken, _) = await _api.Booking.LoginCustomerAsync();

        var (response, body) = await _api.BookNowAsync(token, service.Id, Day, At(9), staff.Id);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var data = Data(body);
        response.Headers.Location!.ToString().Should().EndWith($"/api/v1/me/appointments/{data.GetProperty("appointment").GetProperty("id").GetGuid()}");
        data.GetProperty("appointment").GetProperty("status").GetString().Should().Be("held");
        data.GetProperty("appointment").GetProperty("source").GetString().Should().Be("book_now");
        data.GetProperty("order").GetProperty("status").GetString().Should().Be("pending_payment");
        var appointment = await AppointmentAsync(data.GetProperty("appointment").GetProperty("id").GetGuid());
        appointment.CustomerId.Should().Be(customerId);
        appointment.HoldExpiresAtUtc.Should().BeCloseTo(data.GetProperty("order").GetProperty("paymentDueAtUtc").GetDateTime().AddMinutes(5),
            TimeSpan.FromSeconds(1));
        (await SlotStartsAsync(service.Id, otherToken)).Should().NotContain("09:00").And.NotContain("08:30").And.Contain("10:00");
    }

    [Fact]
    public async Task PaymentSuccessConfirmsHold()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, _) = await _api.Booking.LoginCustomerAsync();
        var (appointmentId, orderId, total) = await BookNowOkAsync(token, service.Id, staff.Id, At(9));

        (await _api.PayAsync(token, orderId, total)).Should().Be("00");

        var appointment = await AppointmentAsync(appointmentId);
        appointment.Status.Should().Be(AppointmentStatus.Confirmed);
        var entitlement = await EntitlementOfLineAsync(appointment.OrderItemId!.Value);
        entitlement.Status.Should().Be(EntitlementStatus.Booked);
        appointment.ServiceEntitlementId.Should().Be(entitlement.Id);
        var (_, order) = await _api.Api.GetAsync($"/api/v1/me/orders/{orderId}", token);
        Data(order).GetProperty("status").GetString().Should().Be("paid");
        Data(order).GetProperty("appointment").GetProperty("status").GetString().Should().Be("confirmed");
    }

    [Fact]
    public async Task UnpaidHoldExpiresWithOrder()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, _) = await _api.Booking.LoginCustomerAsync();
        var (appointmentId, orderId, _) = await BookNowOkAsync(token, service.Id, staff.Id, At(9));

        _factory.Clock.Offset = TimeSpan.FromMinutes(21);
        await _api.ExpireOrdersAsync();

        (await OrderStatusAsync(orderId)).Should().Be(OrderStatus.Expired);
        (await AppointmentAsync(appointmentId)).Status.Should().Be(AppointmentStatus.HoldExpired);
        (await SlotStartsAsync(service.Id, token)).Should().Contain("09:00");
    }

    [Fact]
    public async Task FailedPaymentKeepsHoldThenRetrySucceeds()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, _) = await _api.Booking.LoginCustomerAsync();
        var (appointmentId, orderId, total) = await BookNowOkAsync(token, service.Id, staff.Id, At(9));

        (await _api.PayAsync(token, orderId, total, success: false)).Should().Be("00");
        (await AppointmentAsync(appointmentId)).Status.Should().Be(AppointmentStatus.Held);

        (await _api.PayAsync(token, orderId, total)).Should().Be("00");
        (await AppointmentAsync(appointmentId)).Status.Should().Be(AppointmentStatus.Confirmed);
    }

    [Fact]
    public async Task LateSuccessAfterHoldExpiredLeavesEntitlementAvailable()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, _) = await _api.Booking.LoginCustomerAsync();
        var (appointmentId, orderId, total) = await BookNowOkAsync(token, service.Id, staff.Id, At(9));
        var requestCode = await _api.StartPaymentAsync(token, orderId);
        // Signed in before the clock moves: tokens issued by the shifted clock are not valid yet in real time.
        var (otherToken, _) = await _api.Booking.LoginCustomerAsync();
        _factory.Clock.Offset = TimeSpan.FromMinutes(21);
        await _api.ExpireOrdersAsync();
        // Someone else takes the freed slot.
        await BookNowOkAsync(otherToken, service.Id, staff.Id, At(9));

        (await _api.IpnAsync(requestCode, total)).Should().Be("00");

        (await OrderStatusAsync(orderId)).Should().Be(OrderStatus.Paid);
        var appointment = await AppointmentAsync(appointmentId);
        appointment.Status.Should().Be(AppointmentStatus.HoldExpired);
        (await EntitlementOfLineAsync(appointment.OrderItemId!.Value)).Status.Should().Be(EntitlementStatus.Available);
    }

    [Fact]
    public async Task LateSuccessWhileStillHeldConfirms()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, _) = await _api.Booking.LoginCustomerAsync();
        var (appointmentId, orderId, total) = await BookNowOkAsync(token, service.Id, staff.Id, At(9));
        var requestCode = await _api.StartPaymentAsync(token, orderId);
        _factory.Clock.Offset = TimeSpan.FromMinutes(21);

        (await _api.IpnAsync(requestCode, total)).Should().Be("00");

        (await AppointmentAsync(appointmentId)).Status.Should().Be(AppointmentStatus.Confirmed);
    }

    [Fact]
    public async Task ZeroAmountBookNowIsConfirmedAtOnce()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var promotion = await _api.Orders.SeedPromotionAsync(value: 100);
        var (token, _) = await _api.Booking.LoginCustomerAsync();

        var (response, body) = await _api.BookNowAsync(token, service.Id, Day, At(9), staff.Id, promotion.Code);

        response.StatusCode.Should().Be(HttpStatusCode.Created, body.RootElement.ToString());
        Data(body).GetProperty("appointment").GetProperty("status").GetString().Should().Be("confirmed");
        Data(body).GetProperty("order").GetProperty("status").GetString().Should().Be("paid");
        Data(body).GetProperty("order").GetProperty("payments").GetArrayLength().Should().Be(0);
        var appointment = await AppointmentAsync(Data(body).GetProperty("appointment").GetProperty("id").GetGuid());
        (await EntitlementOfLineAsync(appointment.OrderItemId!.Value)).Status.Should().Be(EntitlementStatus.Booked);
    }

    [Fact]
    public async Task BookNowReplayWithSameKey()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var key = Guid.NewGuid().ToString();

        var (first, firstBody) = await _api.BookNowAsync(token, service.Id, Day, At(9), staff.Id, idempotencyKey: key);
        var (second, secondBody) = await _api.BookNowAsync(token, service.Id, Day, At(9), staff.Id, idempotencyKey: key);

        first.StatusCode.Should().Be(HttpStatusCode.Created);
        second.StatusCode.Should().Be(HttpStatusCode.OK);
        Data(secondBody).GetProperty("order").GetProperty("id").GetGuid().Should().Be(Data(firstBody).GetProperty("order").GetProperty("id").GetGuid());
        await using var context = _postgres.CreateContext();
        (await context.Appointments.CountAsync(row => row.CustomerId == customerId)).Should().Be(1);
    }

    [Fact]
    public async Task BookNowRejections()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var discontinued = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " ngừng", status: CatalogStatus.Discontinued);
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();

        var (notFound, notFoundBody) = await _api.BookNowAsync(token, discontinued.Id, Day, At(9), staff.Id);
        var (offGrid, _) = await _api.BookNowAsync(token, service.Id, Day, At(9, 15), staff.Id);
        var (farAway, _) = await _api.BookNowAsync(token, service.Id, Day.AddDays(60), At(9), staff.Id);
        var (badPromo, badPromoBody) = await _api.BookNowAsync(token, service.Id, Day, At(9), staff.Id, "KHONGCO");

        (notFound.StatusCode, CatalogApi.ErrorCode(notFoundBody)).Should().Be((HttpStatusCode.NotFound, "service_not_found"));
        offGrid.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        farAway.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (badPromo.StatusCode, CatalogApi.ErrorCode(badPromoBody)).Should().Be((HttpStatusCode.BadRequest, "promotion_invalid"));
        await using var context = _postgres.CreateContext();
        (await context.Appointments.CountAsync(row => row.CustomerId == customerId)).Should().Be(0);
        (await context.Orders.CountAsync(row => row.CustomerId == customerId)).Should().Be(0);
    }

    [Fact]
    public async Task CustomerBusyWithOtherStaff()
    {
        var (service, staffA) = await _api.SeedServiceWithStaffAsync("A");
        var staffB = await _api.Booking.SeedQualifiedStaffAsync("B " + CatalogApi.NewTag(), service.Id, (Day, 8, 12));
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        await BookNowOkAsync(token, service.Id, staffA.Id, At(9));
        var (entitlement, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service);

        var (bookNow, bookNowBody) = await _api.BookNowAsync(token, service.Id, Day, At(9, 30), staffB.Id);
        var (flowTwo, flowTwoBody) = await _api.BookAsync(token, Day, At(9, 30), entitlementId: entitlement.Id, staffId: staffB.Id);

        (bookNow.StatusCode, CatalogApi.ErrorCode(bookNowBody)).Should().Be((HttpStatusCode.Conflict, "customer_busy"));
        (flowTwo.StatusCode, CatalogApi.ErrorCode(flowTwoBody)).Should().Be((HttpStatusCode.Conflict, "customer_busy"));
    }

    [Fact]
    public async Task FlowTwoBooksEntitlementOnce()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var (entitlement, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service);

        var (response, body) = await _api.BookAsync(token, Day, At(9), entitlementId: entitlement.Id, staffId: staff.Id);
        var (again, againBody) = await _api.BookAsync(token, Day, At(10), entitlementId: entitlement.Id, staffId: staff.Id);

        response.StatusCode.Should().Be(HttpStatusCode.Created, body.RootElement.ToString());
        var id = Data(body).GetProperty("id").GetGuid();
        response.Headers.Location!.ToString().Should().EndWith($"/api/v1/me/appointments/{id}");
        Data(body).GetProperty("status").GetString().Should().Be("confirmed");
        Data(body).GetProperty("source").GetString().Should().Be("entitlement");
        (await EntitlementOfLineAsync(entitlement.OrderItemId)).Status.Should().Be(EntitlementStatus.Booked);
        (again.StatusCode, CatalogApi.ErrorCode(againBody)).Should().Be((HttpStatusCode.Conflict, "entitlement_not_eligible"));
    }

    [Fact]
    public async Task FlowTwoEntitlementRejections()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var (_, otherCustomer) = await _api.Booking.LoginCustomerAsync();
        var (others, _) = await _api.Purchases.SeedEntitlementAsync(otherCustomer, service);
        var (used, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service, EntitlementStatus.Used);
        var (expired, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service, expiresAtUtc: DateTime.UtcNow.AddDays(-1));

        var results = new List<(HttpStatusCode, string)>();
        foreach (var id in new[] { others.Id, Guid.NewGuid(), used.Id, expired.Id })
        {
            var (response, body) = await _api.BookAsync(token, Day, At(9), entitlementId: id, staffId: staff.Id);
            results.Add((response.StatusCode, CatalogApi.ErrorCode(body)));
        }

        results.Should().Equal(
            (HttpStatusCode.NotFound, "entitlement_not_found"), (HttpStatusCode.NotFound, "entitlement_not_found"),
            (HttpStatusCode.Conflict, "entitlement_not_eligible"), (HttpStatusCode.Conflict, "entitlement_not_eligible"));
    }

    [Fact]
    public async Task FlowTwoPackageSessions()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        await _api.Booking.Staff.SeedShiftAsync(staff.Id, Day.AddDays(7), 8, 12);
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var other = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " B");
        await _api.Booking.AddSkillAsync(staff.Id, other.Id);
        // Items: service × 1, other × 2 (7 days apart) → sessions 1, 2, 3.
        var package = await _api.Api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service, other]);
        var bought = await _api.Purchases.SeedPackageAsync(customerId, package, [service, other]);

        var (first, firstBody) = await _api.BookAsync(token, Day, At(8), sessionId: bought.Sessions[0].Id, staffId: staff.Id);
        var (third, thirdBody) = await _api.BookAsync(token, Day.AddDays(7), At(9), sessionId: bought.Sessions[2].Id, staffId: staff.Id);
        var (tooEarly, tooEarlyBody) = await _api.BookAsync(token, Day, At(10), sessionId: bought.Sessions[1].Id, staffId: staff.Id);
        var (onTime, onTimeBody) = await _api.BookAsync(token, Day.AddDays(7), At(9), sessionId: bought.Sessions[1].Id, staffId: staff.Id);

        first.StatusCode.Should().Be(HttpStatusCode.Created, firstBody.RootElement.ToString());
        Data(firstBody).GetProperty("endTime").GetString().Should().Be("08:45");
        Data(firstBody).GetProperty("treatmentSession").GetProperty("sequenceNumber").GetInt32().Should().Be(1);
        (third.StatusCode, CatalogApi.ErrorCode(thirdBody)).Should().Be((HttpStatusCode.Conflict, "entitlement_not_eligible"));
        (tooEarly.StatusCode, CatalogApi.ErrorCode(tooEarlyBody)).Should().Be((HttpStatusCode.BadRequest, "session_too_early"));
        tooEarlyBody.RootElement.GetProperty("message").GetString().Should().Contain(Day.AddDays(7).ToString("dd/MM/yyyy"));
        onTime.StatusCode.Should().Be(HttpStatusCode.Created, onTimeBody.RootElement.ToString());
    }

    [Fact]
    public async Task FlowTwoPackageNotEligible()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var package = await _api.Api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service]);
        var expired = await _api.Purchases.SeedPackageAsync(customerId, package, [service], expiresAtUtc: DateTime.UtcNow.AddDays(-1));
        var paused = await _api.Purchases.SeedPackageAsync(customerId, package, [service], planStatus: TreatmentPlanStatus.Paused);
        var endsSoon = await _api.Purchases.SeedPackageAsync(customerId, package, [service], expiresAtUtc: DateTime.UtcNow.AddDays(1));
        var booked = await _api.Purchases.SeedPackageAsync(customerId, package, [service], [TreatmentSessionStatus.Booked]);

        var codes = new List<string>();
        foreach (var session in new[] { expired.Sessions[0], paused.Sessions[0], endsSoon.Sessions[0], booked.Sessions[0] })
        {
            var (response, body) = await _api.BookAsync(token, Day, At(9), sessionId: session.Id, staffId: staff.Id);
            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
            codes.Add(CatalogApi.ErrorCode(body));
        }

        codes.Should().AllBe("entitlement_not_eligible");
    }

    [Fact]
    public async Task DiscontinuedServiceEntitlementStillBooks()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var (entitlement, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service);
        await using (var context = _postgres.CreateContext())
        {
            var stored = await context.SpaServices.SingleAsync(row => row.Id == service.Id);
            stored.ChangeStatus(CatalogStatus.Discontinued);
            await context.SaveChangesAsync();
        }

        var (availability, availabilityBody) = await _api.Api.GetAsync(
            $"/api/v1/availability?serviceEntitlementId={entitlement.Id}&date={D(Day)}", token);
        var (response, _) = await _api.BookAsync(token, Day, At(9), entitlementId: entitlement.Id);

        availability.StatusCode.Should().Be(HttpStatusCode.OK);
        Data(availabilityBody).GetProperty("staff").GetArrayLength().Should().Be(1);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task AnyStaffPicksLeastBusyThenName()
    {
        var service = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ");
        var tag = CatalogApi.NewTag();
        var busy = await _api.Booking.SeedQualifiedStaffAsync("A " + tag, service.Id, (Day, 8, 12));
        var free = await _api.Booking.SeedQualifiedStaffAsync("B " + tag, service.Id, (Day, 8, 12));
        var (busyToken, _) = await _api.Booking.LoginCustomerAsync();
        await BookNowOkAsync(busyToken, service.Id, busy.Id, At(11));
        var (token, _) = await _api.Booking.LoginCustomerAsync();
        var (nobodyToken, _) = await _api.Booking.LoginCustomerAsync();

        var (first, firstBody) = await _api.BookNowAsync(token, service.Id, Day, At(8));
        var (other, otherBody) = await _api.BookNowAsync(nobodyToken, service.Id, Day, At(11, 30));
        var (third, thirdBody) = await _api.BookNowAsync(nobodyToken, service.Id, Day, At(8));
        var (none, noneBody) = await _api.BookNowAsync(busyToken, service.Id, Day, At(8, 30));

        first.StatusCode.Should().Be(HttpStatusCode.Created);
        Data(firstBody).GetProperty("appointment").GetProperty("staff").GetProperty("id").GetGuid().Should().Be(free.Id);
        other.StatusCode.Should().Be(HttpStatusCode.Conflict, otherBody.RootElement.ToString());
        third.StatusCode.Should().Be(HttpStatusCode.Created);
        Data(thirdBody).GetProperty("appointment").GetProperty("staff").GetProperty("id").GetGuid().Should().Be(busy.Id);
        (none.StatusCode, CatalogApi.ErrorCode(noneBody)).Should().Be((HttpStatusCode.Conflict, "slot_unavailable"));
    }

    [Fact]
    public async Task ChosenStaffRejections()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var unqualified = await _api.Booking.Staff.SeedStaffAsync("Không kỹ năng " + CatalogApi.NewTag());
        await _api.Booking.Staff.SeedShiftAsync(unqualified.Id, Day, 8, 12);
        var noShift = await _api.Booking.SeedQualifiedStaffAsync("Không ca " + CatalogApi.NewTag(), service.Id);
        var split = await _api.Booking.SeedQualifiedStaffAsync("Hai ca " + CatalogApi.NewTag(), service.Id, (Day, 8, 10), (Day, 10, 12));
        var (token, _) = await _api.Booking.LoginCustomerAsync();

        async Task<(HttpStatusCode, string)> Try(Guid staffId, TimeOnly start)
        {
            var (response, body) = await _api.BookNowAsync(token, service.Id, Day, start, staffId);
            return (response.StatusCode, CatalogApi.ErrorCode(body));
        }

        (await Try(unqualified.Id, At(9))).Should().Be((HttpStatusCode.BadRequest, "staff_not_qualified"));
        (await Try(noShift.Id, At(9))).Should().Be((HttpStatusCode.Conflict, "outside_work_schedule"));
        (await Try(Guid.NewGuid(), At(9))).Should().Be((HttpStatusCode.NotFound, "staff_not_found"));
        (await Try(split.Id, At(9, 30))).Should().Be((HttpStatusCode.Conflict, "outside_work_schedule"));
        (await Try(staff.Id, At(11, 30))).Should().Be((HttpStatusCode.Conflict, "outside_work_schedule"));
    }

    [Fact]
    public async Task AvailabilityBySession()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        await _api.Booking.Staff.SeedShiftAsync(staff.Id, Day.AddDays(7), 8, 12);
        var other = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " B");
        await _api.Booking.AddSkillAsync(staff.Id, other.Id);
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var (otherToken, _) = await _api.Booking.LoginCustomerAsync();
        var package = await _api.Api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service, other]);
        var bought = await _api.Purchases.SeedPackageAsync(customerId, package, [service, other], [TreatmentSessionStatus.Booked]);
        await _api.Purchases.SeedSessionAppointmentAsync(bought.Sessions[0], customerId, staff.Id, Day, At(8), At(9), AppointmentStatus.Confirmed);
        var second = bought.Sessions[1].Id;

        var (_, early) = await _api.Api.GetAsync($"/api/v1/availability?treatmentSessionId={second}&date={D(Day)}", token);
        var (_, onTime) = await _api.Api.GetAsync($"/api/v1/availability?treatmentSessionId={second}&date={D(Day.AddDays(7))}", token);
        var (stranger, _) = await _api.Api.GetAsync($"/api/v1/availability?treatmentSessionId={second}&date={D(Day)}", otherToken);
        var (guest, _) = await _api.Api.GetAsync($"/api/v1/availability?serviceEntitlementId={Guid.NewGuid()}&date={D(Day)}");
        var (both, _) = await _api.Api.GetAsync($"/api/v1/availability?spaServiceId={service.Id}&treatmentSessionId={second}&date={D(Day)}", token);

        Data(early).GetProperty("staff").GetArrayLength().Should().Be(0);
        Data(onTime).GetProperty("staff").GetArrayLength().Should().Be(1);
        Data(onTime).GetProperty("durationMinutes").GetInt32().Should().Be(45);
        stranger.StatusCode.Should().Be(HttpStatusCode.NotFound);
        guest.StatusCode.Should().Be(HttpStatusCode.NotFound);
        both.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task BookingBodyNeedsOneSource()
    {
        var (token, _) = await _api.Booking.LoginCustomerAsync();

        var (none, _) = await _api.BookAsync(token, Day, At(9));
        var (both, _) = await _api.BookAsync(token, Day, At(9), Guid.NewGuid(), Guid.NewGuid());

        none.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        both.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task MyAppointmentDetail()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var (otherToken, _) = await _api.Booking.LoginCustomerAsync();
        var (bookNowId, orderId, _) = await BookNowOkAsync(token, service.Id, staff.Id, At(9));
        var package = await _api.Api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service]);
        var bought = await _api.Purchases.SeedPackageAsync(customerId, package, [service]);
        var (_, sessionBody) = await _api.BookAsync(token, Day, At(10), sessionId: bought.Sessions[0].Id, staffId: staff.Id);
        var sessionAppointment = Data(sessionBody).GetProperty("id").GetGuid();

        var (_, mine) = await _api.Api.GetAsync($"/api/v1/me/appointments/{bookNowId}", token);
        var (_, session) = await _api.Api.GetAsync($"/api/v1/me/appointments/{sessionAppointment}", token);
        var (stranger, strangerBody) = await _api.Api.GetAsync($"/api/v1/me/appointments/{bookNowId}", otherToken);

        Data(mine).GetProperty("source").GetString().Should().Be("book_now");
        Data(mine).GetProperty("order").GetProperty("id").GetGuid().Should().Be(orderId);
        Data(session).GetProperty("source").GetString().Should().Be("session");
        Data(session).GetProperty("treatmentSession").GetProperty("customerPackageId").GetGuid().Should().Be(bought.Package.Id);
        (stranger.StatusCode, CatalogApi.ErrorCode(strangerBody)).Should().Be((HttpStatusCode.NotFound, "appointment_not_found"));
    }

    [Fact]
    public async Task OnlyCustomersUseMyAppointments()
    {
        var owner = await _api.Api.LoginAsync(UserRole.Owner);
        var (staffToken, _) = await _api.Booking.LoginStaffAsync();
        var path = $"/api/v1/me/appointments/{Guid.NewGuid()}";

        (await _api.Api.GetAsync(path, owner)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _api.Api.GetAsync(path, staffToken)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _api.BookNowAsync(owner, Guid.NewGuid(), Day, At(9))).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _api.BookAsync(null, Day, At(9), Guid.NewGuid())).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await _api.Api.GetAsync(path)).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task OwnerCancelOfPaidBookNowReleasesEntitlement()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, _) = await _api.Booking.LoginCustomerAsync();
        var (appointmentId, orderId, total) = await BookNowOkAsync(token, service.Id, staff.Id, At(9));
        await _api.PayAsync(token, orderId, total);
        var owner = await _api.Api.LoginAsync(UserRole.Owner);

        var (response, _) = await _api.Api.SendJsonAsync(HttpMethod.Post, $"/api/v1/appointments/{appointmentId}/cancel", new { reason = "Khách đổi ý" }, owner);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var appointment = await AppointmentAsync(appointmentId);
        (await EntitlementOfLineAsync(appointment.OrderItemId!.Value)).Status.Should().Be(EntitlementStatus.Available);
    }
}
