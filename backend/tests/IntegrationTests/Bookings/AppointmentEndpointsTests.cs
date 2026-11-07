using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Staff;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Bookings.BookingApi;

namespace NhuNguyetSpa.IntegrationTests.Bookings;

/// <summary>UC-SPA-17 endpoints against PostgreSQL (docs/specs/bookings.md BKG-T10..T23).</summary>
[Collection(PostgresCollection.Name)]
public sealed class AppointmentEndpointsTests : IAsyncLifetime
{
    private const string Path = "/api/v1/appointments";
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private BookingApi _booking = null!;
    private string _owner = null!;

    public AppointmentEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    private DateOnly Day => _booking.Staff.Today.AddDays(1);
    private DateOnly Yesterday => _booking.Staff.Today.AddDays(-1);

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _booking = new BookingApi(_factory, _postgres);
        _owner = await _booking.Api.LoginAsync(UserRole.Owner);
    }

    public async Task DisposeAsync()
    {
        _booking.Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private Task<(HttpResponseMessage Response, JsonDocument Body)> Post(Guid id, string action, object payload, string? bearer = null) =>
        _booking.Api.SendJsonAsync(HttpMethod.Post, $"{Path}/{id}/{action}", payload, bearer ?? _owner);

    private static object Move(DateOnly date, string start) => new { date = D(date), startTime = start };

    /// <summary>A service, a qualified staff member with an 08:00–12:00 shift on <paramref name="days"/>, and a confirmed 09:00–10:00 appointment on the first day.</summary>
    private async Task<(SpaService Service, StaffMember Staff, Appointment Appointment)> ArrangeAsync(string name, params DateOnly[] days)
    {
        var service = await _booking.Api.SeedServiceAsync(CatalogApi.NewTag() + " " + name);
        var staff = await _booking.SeedQualifiedStaffAsync("NV " + name, service.Id, days.Select(day => (day, 8, 12)).ToArray());
        var appointment = await _booking.Staff.SeedAppointmentAsync(staff.Id, days[0], At(9), At(10), AppointmentStatus.Confirmed, spaServiceId: service.Id);
        return (service, staff, appointment);
    }

    private static void ShouldFail((HttpResponseMessage Response, JsonDocument Body) result, HttpStatusCode status, string code)
    {
        result.Response.StatusCode.Should().Be(status);
        CatalogApi.ErrorCode(result.Body).Should().Be(code);
    }

    [Fact]
    public async Task ListFiltersSearchesAndLimitsRange()
    {
        var (service, staff, first) = await ArrangeAsync("danh sách", Day);
        var nguyen = await _booking.Staff.SeedCustomerAsync("Nguyễn Văn Lịch", "0911222333");
        var second = await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(10), At(11), AppointmentStatus.Confirmed, spaServiceId: service.Id, customerId: nguyen.Id);
        await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(11), At(12), AppointmentStatus.Cancelled, spaServiceId: service.Id);
        var range = $"fromDate={D(Day)}&toDate={D(Day)}&staffMemberId={staff.Id}";

        var (all, allBody) = await _booking.Api.GetAsync($"{Path}?{range}", _owner);
        var (_, confirmed) = await _booking.Api.GetAsync($"{Path}?{range}&status=confirmed", _owner);
        var (_, searched) = await _booking.Api.GetAsync($"{Path}?{range}&search=nguyen van lich", _owner);
        var (tooLong, _) = await _booking.Api.GetAsync($"{Path}?fromDate={D(Day)}&toDate={D(Day.AddDays(42))}", _owner);

        all.StatusCode.Should().Be(HttpStatusCode.OK);
        var items = CatalogApi.Data(allBody).GetProperty("items");
        items.GetArrayLength().Should().Be(3);
        items[0].GetProperty("id").GetGuid().Should().Be(first.Id);
        items[0].GetProperty("startTime").GetString().Should().Be("09:00");
        items[0].GetProperty("service").GetProperty("name").GetString().Should().Be(service.Name);
        items[0].GetProperty("staff").GetProperty("fullName").GetString().Should().Be("NV danh sách");
        CatalogApi.Data(confirmed).GetProperty("items").GetArrayLength().Should().Be(2);
        CatalogApi.Data(searched).GetProperty("items").EnumerateArray().Select(item => item.GetProperty("id").GetGuid()).Should().Equal(second.Id);
        tooLong.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DetailForOwnerAssignedStaffOnly()
    {
        var (token, staffId) = await _booking.LoginStaffAsync();
        var (otherToken, _) = await _booking.LoginStaffAsync();
        var (customerToken, _) = await _booking.LoginCustomerAsync();
        var customer = await _booking.Staff.SeedCustomerAsync("Khách dị ứng");
        await using (var context = _postgres.CreateContext())
        {
            context.CustomerAllergies.Add(new CustomerAllergy { CustomerId = customer.Id, Allergen = "Cồn", Severity = AllergySeverity.Severe, RecordedAtUtc = DateTime.UtcNow });
            await context.SaveChangesAsync();
        }
        var appointment = await _booking.Staff.SeedAppointmentAsync(staffId, Day, At(9), At(10), AppointmentStatus.Confirmed, customerId: customer.Id);

        var (owner, ownerBody) = await _booking.Api.GetAsync($"{Path}/{appointment.Id}", _owner);
        var (assigned, _) = await _booking.Api.GetAsync($"{Path}/{appointment.Id}", token);
        var other = await _booking.Api.GetAsync($"{Path}/{appointment.Id}", otherToken);
        var (customerView, _) = await _booking.Api.GetAsync($"{Path}/{appointment.Id}", customerToken);
        var missing = await _booking.Api.GetAsync($"{Path}/{Guid.NewGuid()}", _owner);

        owner.StatusCode.Should().Be(HttpStatusCode.OK);
        var allergy = CatalogApi.Data(ownerBody).GetProperty("allergies")[0];
        allergy.GetProperty("allergen").GetString().Should().Be("Cồn");
        allergy.GetProperty("severity").GetString().Should().Be("severe");
        assigned.StatusCode.Should().Be(HttpStatusCode.OK);
        ShouldFail(other, HttpStatusCode.Forbidden, "appointment_not_assigned");
        customerView.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        ShouldFail(missing, HttpStatusCode.NotFound, "appointment_not_found");
    }

    [Fact]
    public async Task RescheduleWithinShiftAndToAnotherDay()
    {
        var (_, _, appointment) = await ArrangeAsync("dời", Day, Day.AddDays(1));

        var (sameDay, sameDayBody) = await Post(appointment.Id, "reschedule", Move(Day, "10:30"));
        var (nextDay, nextDayBody) = await Post(appointment.Id, "reschedule", Move(Day.AddDays(1), "08:00"));

        sameDay.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(sameDayBody).GetProperty("endTime").GetString().Should().Be("11:30");
        nextDay.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(nextDayBody);
        data.GetProperty("date").GetString().Should().Be(D(Day.AddDays(1)));
        data.GetProperty("startTime").GetString().Should().Be("08:00");
        data.GetProperty("endTime").GetString().Should().Be("09:00");
        data.GetProperty("status").GetString().Should().Be("confirmed");
    }

    [Fact]
    public async Task RescheduleErrors()
    {
        var (service, staff, appointment) = await ArrangeAsync("lỗi dời", Day);
        await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(11), At(12), AppointmentStatus.Confirmed, spaServiceId: service.Id);
        var other = await _booking.Staff.SeedStaffAsync("NV khác");
        await _booking.Staff.SeedAppointmentAsync(other.Id, Day, At(8), At(9), AppointmentStatus.Confirmed, customerId: appointment.CustomerId);
        var started = await _booking.Staff.SeedAppointmentAsync(staff.Id, Yesterday, At(9), At(10), AppointmentStatus.Confirmed, spaServiceId: service.Id);

        ShouldFail(await Post(appointment.Id, "reschedule", Move(Day, "11:00")), HttpStatusCode.Conflict, "slot_unavailable");
        ShouldFail(await Post(appointment.Id, "reschedule", Move(Day, "08:00")), HttpStatusCode.Conflict, "customer_busy");
        ShouldFail(await Post(appointment.Id, "reschedule", Move(Day, "13:00")), HttpStatusCode.Conflict, "outside_work_schedule");
        ShouldFail(await Post(appointment.Id, "reschedule", Move(Yesterday, "09:00")), HttpStatusCode.BadRequest, "appointment_in_past");
        ShouldFail(await Post(started.Id, "reschedule", Move(Day, "10:00")), HttpStatusCode.BadRequest, "appointment_in_past");
        (await Post(appointment.Id, "reschedule", new { date = D(Day) })).Response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RescheduleAcrossTwoShiftsIsOutsideSchedule()
    {
        var service = await _booking.Api.SeedServiceAsync(CatalogApi.NewTag() + " hai ca");
        var staff = await _booking.SeedQualifiedStaffAsync("NV hai ca", service.Id, (Day, 8, 10), (Day, 10, 12));
        var appointment = await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(8), At(9), AppointmentStatus.Confirmed, spaServiceId: service.Id);

        ShouldFail(await Post(appointment.Id, "reschedule", Move(Day, "09:30")), HttpStatusCode.Conflict, "outside_work_schedule");
    }

    [Fact]
    public async Task RescheduleOverlappingOwnOldSlot()
    {
        var (_, _, appointment) = await ArrangeAsync("chồng chính mình", Day);

        var (response, _) = await Post(appointment.Id, "reschedule", Move(Day, "09:30"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    /// <summary>Repeated because a race (two EXCLUDE checks waiting on each other → deadlock → 500) only shows up some of the time.</summary>
    [Fact]
    public async Task ConcurrentReschedulesIntoOneSlotLetOnlyOneWin()
    {
        for (var round = 0; round < 8; round++)
        {
            var (service, staff, first) = await ArrangeAsync("đồng thời " + round, Day);
            var second = await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(8), At(9), AppointmentStatus.Confirmed, spaServiceId: service.Id);

            var results = await Task.WhenAll(
                Post(first.Id, "reschedule", Move(Day, "10:30")),
                Post(second.Id, "reschedule", Move(Day, "10:30")));

            results.Select(result => result.Response.StatusCode).Should().BeEquivalentTo([HttpStatusCode.OK, HttpStatusCode.Conflict]);
            CatalogApi.ErrorCode(results.Single(result => result.Response.StatusCode == HttpStatusCode.Conflict).Body).Should().Be("slot_unavailable");
            await using var context = _postgres.CreateContext();
            (await context.Appointments.CountAsync(appointment => appointment.StaffMemberId == staff.Id && appointment.StartTime == At(10, 30)))
                .Should().Be(1);
        }
    }

    /// <summary>BR-BKG-04 has no database constraint, so two moves of one customer's appointments (different staff) must still serialize.</summary>
    [Fact]
    public async Task ConcurrentReschedulesOfOneCustomerCannotOverlap()
    {
        for (var round = 0; round < 8; round++)
        {
            var (service, _, first) = await ArrangeAsync("khách đồng thời " + round, Day);
            var otherStaff = await _booking.SeedQualifiedStaffAsync("NV khác " + round, service.Id, (Day, 8, 12));
            var second = await _booking.Staff.SeedAppointmentAsync(
                otherStaff.Id, Day, At(8), At(9), AppointmentStatus.Confirmed, spaServiceId: service.Id, customerId: first.CustomerId);

            var results = await Task.WhenAll(
                Post(first.Id, "reschedule", Move(Day, "10:00")),
                Post(second.Id, "reschedule", Move(Day, "10:30")));

            results.Select(result => result.Response.StatusCode).Should().BeEquivalentTo([HttpStatusCode.OK, HttpStatusCode.Conflict]);
            CatalogApi.ErrorCode(results.Single(result => result.Response.StatusCode == HttpStatusCode.Conflict).Body).Should().Be("customer_busy");
        }
    }

    [Fact]
    public async Task ConcurrentAssignmentsToOneStaffLetOnlyOneWin()
    {
        for (var round = 0; round < 8; round++)
        {
            var (service, _, first) = await ArrangeAsync("đổi người đồng thời " + round, Day);
            var otherStaff = await _booking.SeedQualifiedStaffAsync("NV nguồn " + round, service.Id, (Day, 8, 12));
            var second = await _booking.Staff.SeedAppointmentAsync(otherStaff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed, spaServiceId: service.Id);
            var target = await _booking.SeedQualifiedStaffAsync("NV đích " + round, service.Id, (Day, 8, 12));

            var results = await Task.WhenAll(
                Post(first.Id, "assign-staff", new { staffMemberId = target.Id }),
                Post(second.Id, "assign-staff", new { staffMemberId = target.Id }));

            results.Select(result => result.Response.StatusCode).Should().BeEquivalentTo([HttpStatusCode.OK, HttpStatusCode.Conflict]);
        }
    }

    [Fact]
    public async Task RescheduleIntoStaleHeldSlotExpiresTheHold()
    {
        var (service, staff, appointment) = await ArrangeAsync("giữ chỗ hết hạn", Day);
        var held = await _booking.Staff.SeedAppointmentAsync(
            staff.Id, Day, At(10, 30), At(11, 30), AppointmentStatus.Held, _factory.Clock.UtcNow.AddMinutes(-5), spaServiceId: service.Id, source: AppointmentSource.OrderItem);

        var (response, _) = await Post(appointment.Id, "reschedule", Move(Day, "10:30"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await _booking.LoadAsync(held.Id)).Status.Should().Be(AppointmentStatus.HoldExpired);
    }

    [Fact]
    public async Task AssignStaffCases()
    {
        var (service, staff, appointment) = await ArrangeAsync("đổi người", Day);
        var free = await _booking.SeedQualifiedStaffAsync("NV rảnh", service.Id, (Day, 8, 12));
        var unskilled = await _booking.Staff.SeedStaffAsync("NV không kỹ năng");
        await _booking.Staff.SeedShiftAsync(unskilled.Id, Day, 8, 12);
        var noShift = await _booking.SeedQualifiedStaffAsync("NV không ca", service.Id);
        var busy = await _booking.SeedQualifiedStaffAsync("NV bận", service.Id, (Day, 8, 12));
        await _booking.Staff.SeedAppointmentAsync(busy.Id, Day, At(9, 30), At(10, 30), AppointmentStatus.Confirmed);
        var resigned = await _booking.SeedQualifiedStaffAsync("NV nghỉ", service.Id, (Day, 8, 12));
        await using (var context = _postgres.CreateContext())
        {
            (await context.StaffMembers.SingleAsync(member => member.Id == resigned.Id)).Resign(Day);
            await context.SaveChangesAsync();
        }

        ShouldFail(await Post(appointment.Id, "assign-staff", new { staffMemberId = unskilled.Id }), HttpStatusCode.BadRequest, "staff_not_qualified");
        ShouldFail(await Post(appointment.Id, "assign-staff", new { staffMemberId = noShift.Id }), HttpStatusCode.Conflict, "staff_not_on_shift");
        ShouldFail(await Post(appointment.Id, "assign-staff", new { staffMemberId = busy.Id }), HttpStatusCode.Conflict, "staff_busy");
        ShouldFail(await Post(appointment.Id, "assign-staff", new { staffMemberId = resigned.Id }), HttpStatusCode.Conflict, "staff_not_on_shift");
        ShouldFail(await Post(appointment.Id, "assign-staff", new { staffMemberId = Guid.NewGuid() }), HttpStatusCode.NotFound, "staff_not_found");
        (await Post(appointment.Id, "assign-staff", new { staffMemberId = staff.Id })).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        var (moved, movedBody) = await Post(appointment.Id, "assign-staff", new { staffMemberId = free.Id });
        moved.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(movedBody).GetProperty("staff").GetProperty("id").GetGuid().Should().Be(free.Id);
    }

    [Fact]
    public async Task CancelGivesEntitlementOrSessionBack()
    {
        var staff = await _booking.Staff.SeedStaffAsync("NV hủy");
        var byEntitlement = await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed);
        var bySession = await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(10), At(11), AppointmentStatus.Confirmed, source: AppointmentSource.Session);
        var completed = await _booking.Staff.SeedAppointmentAsync(staff.Id, Yesterday, At(9), At(10), AppointmentStatus.Completed);

        var (response, body) = await Post(byEntitlement.Id, "cancel", new { reason = "Khách báo bận" });
        (await Post(bySession.Id, "cancel", new { reason = "Đổi ý" })).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Post(byEntitlement.Id, "cancel", new { reason = "" })).Response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        ShouldFail(await Post(completed.Id, "cancel", new { reason = "x" }), HttpStatusCode.Conflict, "appointment_status_invalid");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("status").GetString().Should().Be("cancelled");
        data.GetProperty("cancellationReason").GetString().Should().Be("Khách báo bận");
        data.GetProperty("cancelledAtUtc").GetDateTime().Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        await using var context = _postgres.CreateContext();
        (await context.ServiceEntitlements.SingleAsync(entitlement => entitlement.Id == byEntitlement.ServiceEntitlementId)).Status
            .Should().Be(EntitlementStatus.Available);
        (await context.TreatmentSessions.SingleAsync(session => session.Id == bySession.TreatmentSessionId)).Status
            .Should().Be(TreatmentSessionStatus.NotBooked);
    }

    [Fact]
    public async Task NoShowCases()
    {
        var staff = await _booking.Staff.SeedStaffAsync("NV không đến");
        var future = await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed);
        var past = await _booking.Staff.SeedAppointmentAsync(staff.Id, Yesterday, At(9), At(10), AppointmentStatus.Confirmed);
        var pending = await _booking.Staff.SeedAppointmentAsync(staff.Id, Yesterday, At(11), At(12), AppointmentStatus.PendingConfirmation);

        ShouldFail(await Post(future.Id, "no-show", new { }), HttpStatusCode.BadRequest, "no_show_too_early");
        var (response, body) = await Post(past.Id, "no-show", new { note = "Gọi không nghe máy" });
        ShouldFail(await Post(pending.Id, "no-show", new { }), HttpStatusCode.Conflict, "appointment_status_invalid");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(body).GetProperty("status").GetString().Should().Be("no_show");
        CatalogApi.Data(body).GetProperty("note").GetString().Should().Be("Gọi không nghe máy");
        await using var context = _postgres.CreateContext();
        (await context.ServiceEntitlements.SingleAsync(entitlement => entitlement.Id == past.ServiceEntitlementId)).Status
            .Should().Be(EntitlementStatus.Available);
    }

    [Fact]
    public async Task ConfirmCases()
    {
        var staff = await _booking.Staff.SeedStaffAsync("NV xác nhận");
        var pending = await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.PendingConfirmation);
        var confirmed = await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(10), At(11), AppointmentStatus.Confirmed);

        var (response, body) = await Post(pending.Id, "confirm", new { });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(body).GetProperty("status").GetString().Should().Be("confirmed");
        ShouldFail(await Post(confirmed.Id, "confirm", new { }), HttpStatusCode.Conflict, "appointment_status_invalid");
    }

    [Fact]
    public async Task HeldCannotBeManaged()
    {
        var (_, staff, _) = await ArrangeAsync("held", Day);
        var held = await _booking.Staff.SeedAppointmentAsync(
            staff.Id, Day, At(11), At(12), AppointmentStatus.Held, _factory.Clock.UtcNow.AddMinutes(10), source: AppointmentSource.OrderItem);

        ShouldFail(await Post(held.Id, "reschedule", Move(Day, "08:00")), HttpStatusCode.Conflict, "appointment_status_invalid");
        ShouldFail(await Post(held.Id, "cancel", new { reason = "x" }), HttpStatusCode.Conflict, "appointment_status_invalid");
        ShouldFail(await Post(held.Id, "assign-staff", new { staffMemberId = staff.Id }), HttpStatusCode.Conflict, "appointment_status_invalid");
    }

    [Fact]
    public async Task OwnerCanRescheduleAppointmentOfDiscontinuedService()
    {
        var (service, _, appointment) = await ArrangeAsync("ngừng bán", Day);
        await using (var context = _postgres.CreateContext())
        {
            (await context.SpaServices.SingleAsync(item => item.Id == service.Id)).ChangeStatus(CatalogStatus.Discontinued);
            await context.SaveChangesAsync();
        }

        var (availability, _) = await _booking.Api.GetAsync(
            $"/api/v1/availability?spaServiceId={service.Id}&date={D(Day)}&appointmentId={appointment.Id}", _owner);
        var (response, _) = await Post(appointment.Id, "reschedule", Move(Day, "10:00"));

        availability.StatusCode.Should().Be(HttpStatusCode.OK);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task OnlyOwnerManagesAndNoDelete()
    {
        var (_, _, appointment) = await ArrangeAsync("quyền", Day);
        var (staffToken, _) = await _booking.LoginStaffAsync();
        var (customerToken, _) = await _booking.LoginCustomerAsync();

        (await Post(appointment.Id, "cancel", new { reason = "x" }, staffToken)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await Post(appointment.Id, "cancel", new { reason = "x" }, customerToken)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _booking.Api.GetAsync($"{Path}?fromDate={D(Day)}&toDate={D(Day)}", staffToken)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _booking.Api.SendAsync(HttpMethod.Post, $"{Path}/{appointment.Id}/confirm", null, null)).Response.StatusCode
            .Should().Be(HttpStatusCode.Unauthorized);
        (await _booking.Api.SendAsync(HttpMethod.Delete, $"{Path}/{appointment.Id}", null, _owner)).Response.StatusCode
            .Should().Be(HttpStatusCode.MethodNotAllowed);
    }
}
