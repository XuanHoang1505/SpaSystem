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

/// <summary>
/// UC-SPA-16 over HTTP (docs/specs/bookings.md BKG-T50..T61, T63, T65, T66). Visits are on <see cref="Day"/> (two days ahead), so
/// they are more than 24 hours away unless a test moves the clock (after logging in).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class MyAppointmentEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CustomerBookingApi _api = null!;

    public MyAppointmentEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

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

    private static (HttpStatusCode, string) Error(HttpResponseMessage response, JsonDocument body) => (response.StatusCode, CatalogApi.ErrorCode(body));

    private async Task<T> LoadAsync<T>(Guid id) where T : Domain.Common.BaseEntity
    {
        await using var context = _postgres.CreateContext();
        return await context.Set<T>().AsNoTracking().SingleAsync(row => row.Id == id);
    }

    /// <summary>A customer with a bought service booked (flow 2) with the staff member at <paramref name="start"/> on <see cref="Day"/>.</summary>
    private async Task<Booked> BookEntitlementAsync(TimeOnly start)
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var (entitlement, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service);
        var (response, body) = await _api.BookAsync(token, Day, start, entitlementId: entitlement.Id, staffId: staff.Id);
        response.StatusCode.Should().Be(HttpStatusCode.Created, body.RootElement.ToString());
        return new Booked(token, customerId, service, staff, Data(body).GetProperty("id").GetGuid(), entitlement.Id);
    }

    private sealed record Booked(string Token, Guid CustomerId, SpaService Service, StaffMember Staff, Guid AppointmentId, Guid EntitlementId);

    [Fact]
    public async Task Bkg_T50_ListGroupsByScope()
    {
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var staff = await _api.Booking.Staff.SeedStaffAsync("NV danh sách " + CatalogApi.NewTag());
        var hold = _factory.Clock.UtcNow.AddMinutes(20);
        foreach (var (offset, status) in new[]
                 {
                     (1, AppointmentStatus.Confirmed), (2, AppointmentStatus.PendingConfirmation), (3, AppointmentStatus.Held),
                     (-3, AppointmentStatus.Completed), (-2, AppointmentStatus.NoShow), (4, AppointmentStatus.Cancelled), (5, AppointmentStatus.HoldExpired),
                 })
            await _api.Booking.Staff.SeedAppointmentAsync(staff.Id, Day.AddDays(offset), At(9), At(10), status,
                status is AppointmentStatus.Held or AppointmentStatus.HoldExpired ? hold : null, customerId: customerId);
        await _api.Booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(11), At(12), AppointmentStatus.Confirmed);

        async Task<string[]> Statuses(string query)
        {
            var (response, body) = await _api.ListMineAsync(token, query);
            response.StatusCode.Should().Be(HttpStatusCode.OK, body.RootElement.ToString());
            return Data(body).GetProperty("items").EnumerateArray().Select(item => item.GetProperty("status").GetString()!).ToArray();
        }

        (await Statuses("scope=upcoming")).Should().Equal("confirmed", "pending_confirmation", "held");
        (await Statuses("scope=past")).Should().Equal("no_show", "completed");
        (await Statuses("scope=cancelled")).Should().Equal("hold_expired", "cancelled");
        (await Statuses("")).Should().HaveCount(7);
        (await Statuses("status=confirmed")).Should().Equal("confirmed");
        (await Statuses($"fromDate={D(Day.AddDays(2))}&toDate={D(Day.AddDays(4))}")).Should().Equal("cancelled", "held", "pending_confirmation");
        var (_, page) = await _api.ListMineAsync(token, "pageNumber=2&pageSize=3");
        Data(page).GetProperty("totalCount").GetInt32().Should().Be(7);
        var first = Data(page).GetProperty("items")[0];
        first.TryGetProperty("canReschedule", out _).Should().BeTrue();
        first.GetProperty("service").GetProperty("name").GetString().Should().NotBeNullOrEmpty();
    }

    [Theory]
    [InlineData("scope=abc")]
    [InlineData("status=abc")]
    [InlineData("fromDate=2026-12-10&toDate=2026-12-01")]
    public async Task Bkg_T51_InvalidListFilters(string query)
    {
        var (token, _) = await _api.Booking.LoginCustomerAsync();

        var (response, _) = await _api.ListMineAsync(token, query);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Bkg_T52_FlagsFollowStatusCutoffAndPlan()
    {
        var booked = await BookEntitlementAsync(At(10));
        var (_, before) = await _api.GetMineAsync(booked.Token, booked.AppointmentId);
        (Data(before).GetProperty("canReschedule").GetBoolean(), Data(before).GetProperty("canCancel").GetBoolean()).Should().Be((true, true));
        Data(before).GetProperty("changeDeadlineAtUtc").GetDateTime().Should().Be(SpaTimeUtc(Day.AddDays(-1), At(10)));

        var service = booked.Service;
        var package = await _api.Api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service]);
        var paused = await _api.Purchases.SeedPackageAsync(booked.CustomerId, package, [service], [TreatmentSessionStatus.Booked],
            planStatus: TreatmentPlanStatus.Paused);
        var sessionVisit = await _api.Purchases.SeedSessionAppointmentAsync(
            paused.Sessions[0], booked.CustomerId, booked.Staff.Id, Day, At(11), At(12), AppointmentStatus.Confirmed);
        var (_, pausedBody) = await _api.GetMineAsync(booked.Token, sessionVisit.Id);
        (Data(pausedBody).GetProperty("canReschedule").GetBoolean(), Data(pausedBody).GetProperty("canCancel").GetBoolean()).Should().Be((false, true));

        _api.SetVietnamNow(Day.AddDays(-1).ToDateTime(At(11)));
        var (_, inside) = await _api.GetMineAsync(booked.Token, booked.AppointmentId);
        (Data(inside).GetProperty("canReschedule").GetBoolean(), Data(inside).GetProperty("canCancel").GetBoolean()).Should().Be((false, false));
    }

    private static DateTime SpaTimeUtc(DateOnly date, TimeOnly time) => Application.Common.SpaTime.ToUtc(date.ToDateTime(time));

    [Fact]
    public async Task Bkg_T53_CancelGivesBackWhatWasUsed()
    {
        var booked = await BookEntitlementAsync(At(9));
        var (response, body) = await _api.CancelAsync(booked.Token, booked.AppointmentId, "  Có việc gấp  ");

        response.StatusCode.Should().Be(HttpStatusCode.OK, body.RootElement.ToString());
        Data(body).GetProperty("status").GetString().Should().Be("cancelled");
        Data(body).GetProperty("cancellationReason").GetString().Should().Be("Có việc gấp");
        (await LoadAsync<Appointment>(booked.AppointmentId)).CancelledAtUtc.Should().NotBeNull();
        (await LoadAsync<ServiceEntitlement>(booked.EntitlementId)).Status.Should().Be(EntitlementStatus.Available);
        var (_, slots) = await _api.Api.GetAsync($"/api/v1/availability?spaServiceId={booked.Service.Id}&date={D(Day)}&staffMemberId={booked.Staff.Id}", booked.Token);
        Data(slots).GetProperty("staff")[0].GetProperty("slots").EnumerateArray().Select(slot => slot.GetProperty("startTime").GetString())
            .Should().Contain("09:00");

        var package = await _api.Api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [booked.Service]);
        var bought = await _api.Purchases.SeedPackageAsync(booked.CustomerId, package, [booked.Service]);
        var (_, sessionBody) = await _api.BookAsync(booked.Token, Day, At(10), sessionId: bought.Sessions[0].Id, staffId: booked.Staff.Id);
        var (sessionCancel, _) = await _api.CancelAsync(booked.Token, Data(sessionBody).GetProperty("id").GetGuid());
        sessionCancel.StatusCode.Should().Be(HttpStatusCode.OK);
        (await LoadAsync<TreatmentSession>(bought.Sessions[0].Id)).Status.Should().Be(TreatmentSessionStatus.NotBooked);

        var (bookNow, bookNowBody) = await _api.BookNowAsync(booked.Token, booked.Service.Id, Day, At(11), booked.Staff.Id);
        bookNow.StatusCode.Should().Be(HttpStatusCode.Created, bookNowBody.RootElement.ToString());
        var order = Data(bookNowBody).GetProperty("order");
        await _api.PayAsync(booked.Token, order.GetProperty("id").GetGuid(), order.GetProperty("grandTotal").GetDecimal());
        var paidId = Data(bookNowBody).GetProperty("appointment").GetProperty("id").GetGuid();
        var (paidCancel, _) = await _api.CancelAsync(booked.Token, paidId);
        paidCancel.StatusCode.Should().Be(HttpStatusCode.OK);
        var paid = await LoadAsync<Appointment>(paidId);
        (await LoadAsync<ServiceEntitlement>(paid.ServiceEntitlementId!.Value)).Status.Should().Be(EntitlementStatus.Available);
    }

    [Fact]
    public async Task Bkg_T54_CancelTooLateOrStarted()
    {
        var booked = await BookEntitlementAsync(At(10));

        _api.SetVietnamNow(Day.AddDays(-1).ToDateTime(At(11)));
        var (late, lateBody) = await _api.CancelAsync(booked.Token, booked.AppointmentId);
        _api.SetVietnamNow(Day.ToDateTime(At(10, 5)));
        var (started, startedBody) = await _api.CancelAsync(booked.Token, booked.AppointmentId);

        Error(late, lateBody).Should().Be((HttpStatusCode.BadRequest, "change_window_passed"));
        lateBody.RootElement.GetProperty("message").GetString().Should().Contain("24 giờ");
        Error(started, startedBody).Should().Be((HttpStatusCode.BadRequest, "change_window_passed"));
        (await LoadAsync<ServiceEntitlement>(booked.EntitlementId)).Status.Should().Be(EntitlementStatus.Booked);
    }

    [Fact]
    public async Task Bkg_T55_CancelWrongStatusOrReason()
    {
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var staff = await _api.Booking.Staff.SeedStaffAsync("NV trạng thái " + CatalogApi.NewTag());
        var hold = _factory.Clock.UtcNow.AddMinutes(20);
        var results = new List<(HttpStatusCode, string)>();
        var hour = 8;
        foreach (var status in new[] { AppointmentStatus.Held, AppointmentStatus.Completed, AppointmentStatus.Cancelled, AppointmentStatus.NoShow, AppointmentStatus.HoldExpired })
        {
            var appointment = await _api.Booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(hour), At(hour + 1), status,
                status is AppointmentStatus.Held or AppointmentStatus.HoldExpired ? hold : null, customerId: customerId);
            hour++;
            var (response, body) = await _api.CancelAsync(token, appointment.Id);
            results.Add(Error(response, body));
        }
        var confirmed = await _api.Booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(14), At(15), AppointmentStatus.Confirmed, customerId: customerId);
        var (missing, _) = await _api.CancelAsync(token, confirmed.Id, null);
        var (tooLong, _) = await _api.CancelAsync(token, confirmed.Id, new string('a', 501));

        results.Should().AllBeEquivalentTo((HttpStatusCode.Conflict, "appointment_status_invalid"));
        missing.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        tooLong.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Bkg_T56_RescheduleSameStaffOtherStaffAndAnyStaff()
    {
        var booked = await BookEntitlementAsync(At(9));
        await _api.Booking.Staff.SeedShiftAsync(booked.Staff.Id, Day.AddDays(1), 8, 12);
        var binh = await _api.Booking.SeedQualifiedStaffAsync("Bình " + CatalogApi.NewTag(), booked.Service.Id, (Day, 8, 12), (Day.AddDays(1), 8, 12));

        var (moved, movedBody) = await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day.AddDays(1), At(10), booked.Staff.Id);
        moved.StatusCode.Should().Be(HttpStatusCode.OK, movedBody.RootElement.ToString());
        (Data(movedBody).GetProperty("date").GetString(), Data(movedBody).GetProperty("startTime").GetString(), Data(movedBody).GetProperty("endTime").GetString())
            .Should().Be((D(Day.AddDays(1)), "10:00", "11:00"));
        Data(movedBody).GetProperty("status").GetString().Should().Be("confirmed");

        var (other, otherBody) = await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day.AddDays(1), At(10), binh.Id);
        other.StatusCode.Should().Be(HttpStatusCode.OK, otherBody.RootElement.ToString());
        Data(otherBody).GetProperty("staff").GetProperty("id").GetGuid().Should().Be(binh.Id);

        // Bình now has this visit on Day+1; An has one other visit on Day → "any staff" on Day picks Bình (fewest that day).
        await _api.Booking.Staff.SeedAppointmentAsync(booked.Staff.Id, Day, At(8), At(9), AppointmentStatus.Confirmed);
        var (any, anyBody) = await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day, At(10));
        any.StatusCode.Should().Be(HttpStatusCode.OK, anyBody.RootElement.ToString());
        Data(anyBody).GetProperty("staff").GetProperty("id").GetGuid().Should().Be(binh.Id);
    }

    [Fact]
    public async Task Bkg_T57_OverlapWithItselfAndSameSlot()
    {
        var booked = await BookEntitlementAsync(At(9));

        var (overlap, overlapBody) = await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day, At(9, 30), booked.Staff.Id);
        var (same, sameBody) = await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day, At(9, 30));

        overlap.StatusCode.Should().Be(HttpStatusCode.OK, overlapBody.RootElement.ToString());
        Data(overlapBody).GetProperty("startTime").GetString().Should().Be("09:30");
        same.StatusCode.Should().Be(HttpStatusCode.OK, sameBody.RootElement.ToString());
        Data(sameBody).GetProperty("staff").GetProperty("id").GetGuid().Should().Be(booked.Staff.Id);
    }

    [Fact]
    public async Task Bkg_T58_RescheduleConflictsAndBadInput()
    {
        var booked = await BookEntitlementAsync(At(9));
        await _api.Booking.Staff.SeedAppointmentAsync(booked.Staff.Id, Day, At(10), At(11), AppointmentStatus.Confirmed);
        var other = await _api.Booking.Staff.SeedStaffAsync("NV khác " + CatalogApi.NewTag());
        await _api.Booking.Staff.SeedShiftAsync(other.Id, Day, 8, 12);
        await _api.Booking.Staff.SeedAppointmentAsync(other.Id, Day, At(11), At(12), AppointmentStatus.Confirmed, customerId: booked.CustomerId);
        var unskilled = await _api.Booking.Staff.SeedStaffAsync("NV chưa học " + CatalogApi.NewTag());
        await _api.Booking.Staff.SeedShiftAsync(unskilled.Id, Day, 8, 12);

        var results = new[]
        {
            Error(await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day, At(10), booked.Staff.Id)),
            Error(await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day, At(11), booked.Staff.Id)),
            Error(await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day, At(14), booked.Staff.Id)),
            Error(await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day, At(8), unskilled.Id)),
            Error(await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day, At(8), Guid.NewGuid())),
        };
        var invalid = new[]
        {
            (await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day.AddDays(-3), At(8), booked.Staff.Id)).Response.StatusCode,
            (await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day, At(8, 15), booked.Staff.Id)).Response.StatusCode,
            (await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day.AddDays(59), At(8), booked.Staff.Id)).Response.StatusCode,
        };

        results.Should().Equal(
            (HttpStatusCode.Conflict, "slot_unavailable"), (HttpStatusCode.Conflict, "customer_busy"),
            (HttpStatusCode.Conflict, "outside_work_schedule"), (HttpStatusCode.BadRequest, "staff_not_qualified"),
            (HttpStatusCode.NotFound, "staff_not_found"));
        invalid.Should().AllBeEquivalentTo(HttpStatusCode.BadRequest);
        (await LoadAsync<Appointment>(booked.AppointmentId)).StartTime.Should().Be(At(9));
    }

    private static (HttpStatusCode, string) Error((HttpResponseMessage Response, JsonDocument Body) result) => Error(result.Response, result.Body);

    [Fact]
    public async Task Bkg_T59_RescheduleTooLateOrWrongStatus()
    {
        var booked = await BookEntitlementAsync(At(10));
        var hold = _factory.Clock.UtcNow.AddMinutes(20);
        var held = await _api.Booking.Staff.SeedAppointmentAsync(booked.Staff.Id, Day, At(8), At(9), AppointmentStatus.Held, hold,
            customerId: booked.CustomerId, source: Staff.AppointmentSource.OrderItem);
        var completed = await _api.Booking.Staff.SeedAppointmentAsync(booked.Staff.Id, Day.AddDays(-3), At(8), At(9), AppointmentStatus.Completed,
            customerId: booked.CustomerId);

        var heldResult = Error(await _api.RescheduleAsync(booked.Token, held.Id, Day, At(11), booked.Staff.Id));
        var completedResult = Error(await _api.RescheduleAsync(booked.Token, completed.Id, Day, At(11), booked.Staff.Id));
        _api.SetVietnamNow(Day.AddDays(-1).ToDateTime(At(11)));
        var late = Error(await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day, At(11), booked.Staff.Id));

        late.Should().Be((HttpStatusCode.BadRequest, "change_window_passed"));
        heldResult.Should().Be((HttpStatusCode.Conflict, "appointment_status_invalid"));
        completedResult.Should().Be((HttpStatusCode.Conflict, "appointment_status_invalid"));
    }

    [Fact]
    public async Task Bkg_T60_PackageSessionKeepsOrder()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        foreach (var offset in new[] { 3, 7, 13, 14, 20 })
            await _api.Booking.Staff.SeedShiftAsync(staff.Id, Day.AddDays(offset), 8, 12);
        // Items: service × 1 (unused here); second × 2 (gap 7) → sessions 1, 2, 3 where 2 and 3 use "second".
        var second = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " B");
        await _api.Booking.AddSkillAsync(staff.Id, second.Id);
        var package = await _api.Api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service, second]);
        var bought = await _api.Purchases.SeedPackageAsync(customerId, package, [service, second],
            [TreatmentSessionStatus.Booked, TreatmentSessionStatus.Booked, TreatmentSessionStatus.Booked], expiresAtUtc: DateTime.UtcNow.AddDays(18));
        await _api.Purchases.SeedSessionAppointmentAsync(bought.Sessions[0], customerId, staff.Id, Day, At(8), At(9), AppointmentStatus.Confirmed);
        var middle = await _api.Purchases.SeedSessionAppointmentAsync(bought.Sessions[1], customerId, staff.Id, Day.AddDays(7), At(9), At(10),
            AppointmentStatus.Confirmed);
        await _api.Purchases.SeedSessionAppointmentAsync(bought.Sessions[2], customerId, staff.Id, Day.AddDays(20), At(9), At(10), AppointmentStatus.Confirmed);

        var tooEarly = Error(await _api.RescheduleAsync(token, middle.Id, Day.AddDays(3), At(9), staff.Id));
        var (tooLate, tooLateBody) = await _api.RescheduleAsync(token, middle.Id, Day.AddDays(14), At(9), staff.Id);
        var (latest, latestBody) = await _api.RescheduleAsync(token, middle.Id, Day.AddDays(13), At(9), staff.Id);

        tooEarly.Should().Be((HttpStatusCode.BadRequest, "session_too_early"));
        Error(tooLate, tooLateBody).Should().Be((HttpStatusCode.BadRequest, "session_too_late"));
        tooLateBody.RootElement.GetProperty("message").GetString().Should().Contain(Day.AddDays(13).ToString("dd/MM/yyyy"));
        latest.StatusCode.Should().Be(HttpStatusCode.OK, latestBody.RootElement.ToString());
    }

    [Fact]
    public async Task Bkg_T61_PausedPlanAndExpiredEntitlement()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var package = await _api.Api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service]);
        var paused = await _api.Purchases.SeedPackageAsync(customerId, package, [service], [TreatmentSessionStatus.Booked],
            planStatus: TreatmentPlanStatus.Paused);
        var visit = await _api.Purchases.SeedSessionAppointmentAsync(paused.Sessions[0], customerId, staff.Id, Day, At(8), At(9), AppointmentStatus.Confirmed);
        var (entitlement, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service, EntitlementStatus.Booked, DateTime.UtcNow.AddMinutes(-1));
        var expired = await _api.Purchases.SeedEntitlementAppointmentAsync(entitlement, staff.Id, Day, At(10), At(11), AppointmentStatus.Confirmed);

        var pausedMove = Error(await _api.RescheduleAsync(token, visit.Id, Day, At(9), staff.Id));
        var expiredMove = Error(await _api.RescheduleAsync(token, expired.Id, Day, At(11), staff.Id));
        var (cancel, _) = await _api.CancelAsync(token, visit.Id);

        pausedMove.Should().Be((HttpStatusCode.Conflict, "entitlement_not_eligible"));
        expiredMove.Should().Be((HttpStatusCode.Conflict, "entitlement_not_eligible"));
        cancel.StatusCode.Should().Be(HttpStatusCode.OK);
        (await LoadAsync<TreatmentSession>(paused.Sessions[0].Id)).Status.Should().Be(TreatmentSessionStatus.NotBooked);
    }

    [Fact]
    public async Task Bkg_T63_ExpiredHoldDoesNotBlock()
    {
        var booked = await BookEntitlementAsync(At(9));
        var stale = await _api.Booking.Staff.SeedAppointmentAsync(booked.Staff.Id, Day, At(11), At(12), AppointmentStatus.Held,
            _factory.Clock.UtcNow.AddMinutes(-1), source: Staff.AppointmentSource.OrderItem);

        var (response, body) = await _api.RescheduleAsync(booked.Token, booked.AppointmentId, Day, At(11), booked.Staff.Id);

        response.StatusCode.Should().Be(HttpStatusCode.OK, body.RootElement.ToString());
        (await LoadAsync<Appointment>(stale.Id)).Status.Should().Be(AppointmentStatus.HoldExpired);
    }

    [Fact]
    public async Task Bkg_T65_OthersAppointmentIsNotFound()
    {
        var booked = await BookEntitlementAsync(At(9));
        var (stranger, _) = await _api.Booking.LoginCustomerAsync();

        var results = new[]
        {
            Error(await _api.GetMineAsync(stranger, booked.AppointmentId)),
            Error(await _api.RescheduleAsync(stranger, booked.AppointmentId, Day, At(10), booked.Staff.Id)),
            Error(await _api.CancelAsync(stranger, booked.AppointmentId)),
            Error(await _api.CancelAsync(stranger, Guid.NewGuid())),
        };

        results.Should().AllBeEquivalentTo((HttpStatusCode.NotFound, "appointment_not_found"));
        (await LoadAsync<Appointment>(booked.AppointmentId)).Status.Should().Be(AppointmentStatus.Confirmed);
    }

    [Fact]
    public async Task Bkg_T66_OnlyCustomersMayUseMyAppointments()
    {
        var owner = await _api.Api.LoginAsync(UserRole.Owner);
        var (staffToken, _) = await _api.Booking.LoginStaffAsync();
        var id = Guid.NewGuid();

        foreach (var token in new[] { owner, staffToken })
        {
            (await _api.ListMineAsync(token)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
            (await _api.RescheduleAsync(token, id, Day, At(9))).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
            (await _api.CancelAsync(token, id)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
        (await _api.ListMineAsync(null)).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await _api.RescheduleAsync(null, id, Day, At(9))).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await _api.CancelAsync(null, id)).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
