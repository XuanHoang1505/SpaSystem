using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Bookings.BookingApi;
using static NhuNguyetSpa.IntegrationTests.Treatments.TreatmentApi;

namespace NhuNguyetSpa.IntegrationTests.Treatments;

/// <summary>UC-SPA-21 (docs/specs/purchases-treatments.md TRT-T21…T29, T31; Q-37, Q-38).</summary>
[Collection(PostgresCollection.Name)]
public sealed class TreatmentManagementEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private TreatmentApi _api = null!;
    private string _owner = null!;
    private string _lead = null!;
    private Guid _leadId;
    private string _helper = null!;
    private Guid _helperId;
    private string _outsider = null!;
    private Guid _customerId;

    public TreatmentManagementEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    private DateOnly Today => _api.Today;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new TreatmentApi(_factory, _postgres);
        _owner = await _api.Api.LoginAsync(UserRole.Owner);
        (_lead, _leadId) = await _api.Booking.LoginStaffAsync();
        (_helper, _helperId) = await _api.Booking.LoginStaffAsync();
        (_outsider, _) = await _api.Booking.LoginStaffAsync();
        _customerId = (await _api.Staff.SeedCustomerAsync("Nguyễn Thị Mai " + Guid.NewGuid().ToString("N")[..4])).Id;
    }

    public async Task DisposeAsync()
    {
        _api.Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private static string P(Guid planId, string suffix = "") => $"/api/v1/treatments/{planId}{suffix}";

    /// <summary>P1: led by S1 (<c>_lead</c>), session 2 booked with a confirmed visit of S2 (<c>_helper</c>).</summary>
    private async Task<SeededPlan> SharedPlanAsync()
    {
        var plan = await _api.SeedPlanAsync(_customerId,
            [TreatmentSessionStatus.Completed, TreatmentSessionStatus.Booked, TreatmentSessionStatus.NotBooked], primaryStaffId: _leadId,
            startDate: Today.AddDays(-10));
        await _api.SeedVisitAsync(plan.Sessions[0], _customerId, _leadId, Today.AddDays(-10), AppointmentStatus.Completed);
        await _api.SeedVisitAsync(plan.Sessions[1], _customerId, _helperId, Today.AddDays(2), AppointmentStatus.Confirmed);
        return plan;
    }

    private static List<Guid> Ids(JsonElement page) =>
        page.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("id").GetGuid()).ToList();

    [Fact]
    public async Task TrtT21_OwnerListFilters()
    {
        var tag = Guid.NewGuid().ToString("N")[..6];
        var phone = "09" + Random.Shared.NextInt64(10_000_000, 99_999_999);
        var customer = (await _api.Staff.SeedCustomerAsync($"Trần Thị Hương {tag}", phone)).Id;
        var paused = await _api.SeedPlanAsync(customer, [TreatmentSessionStatus.NotBooked], planStatus: TreatmentPlanStatus.Paused,
            purchasedAtUtc: _factory.Clock.UtcNow.AddDays(-5));
        var led = await _api.SeedPlanAsync(customer, [TreatmentSessionStatus.NotBooked], primaryStaffId: _leadId,
            purchasedAtUtc: _factory.Clock.UtcNow.AddDays(-4));

        Ids(Ok(await _api.Get($"/api/v1/treatments?search={Uri.EscapeDataString($"tran thi huong {tag}")}", _owner))).Should().Equal(led.PlanId, paused.PlanId);
        Ids(Ok(await _api.Get($"/api/v1/treatments?search={phone}", _owner))).Should().Equal(led.PlanId, paused.PlanId);
        Ids(Ok(await _api.Get($"/api/v1/treatments?customerId={customer}&status=paused", _owner))).Should().Equal(paused.PlanId);
        Ids(Ok(await _api.Get($"/api/v1/treatments?customerId={customer}&primaryStaffMemberId={_leadId}", _owner))).Should().Equal(led.PlanId);
        var page = Ok(await _api.Get($"/api/v1/treatments?customerId={customer}&pageSize=1", _owner));
        page.GetProperty("totalCount").GetInt32().Should().Be(2);
        Ids(page).Should().Equal(led.PlanId);
        ShouldFail(await _api.Get("/api/v1/treatments?status=done", _owner), HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task TrtT22_StaffScope()
    {
        var plan = await SharedPlanAsync();

        Ids(Ok(await _api.Get("/api/v1/treatments", _lead))).Should().Contain(plan.PlanId);
        Ids(Ok(await _api.Get("/api/v1/treatments", _helper))).Should().Contain(plan.PlanId);
        Ids(Ok(await _api.Get("/api/v1/treatments", _outsider))).Should().NotContain(plan.PlanId);
        Ok(await _api.Get(P(plan.PlanId), _lead)).GetProperty("canEdit").GetBoolean().Should().BeTrue();
        Ok(await _api.Get(P(plan.PlanId), _helper)).GetProperty("canEdit").GetBoolean().Should().BeFalse();
        ShouldFail(await _api.Get(P(plan.PlanId), _outsider), HttpStatusCode.NotFound, "treatment_plan_not_found");

        await using var off = _factory.WithWebHostBuilder(builder => builder.UseSetting("Treatments:AssignedStaffCanView", "false"));
        using var client = off.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, P(plan.PlanId));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _helper);
        (await client.SendAsync(request)).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task StaffMatchedTwiceListedOnce()
    {
        var plan = await _api.SeedPlanAsync(_customerId, [TreatmentSessionStatus.Booked, TreatmentSessionStatus.Booked], primaryStaffId: _helperId);
        await _api.SeedVisitAsync(plan.Sessions[0], _customerId, _helperId, Today.AddDays(1), AppointmentStatus.Confirmed);
        await _api.SeedVisitAsync(plan.Sessions[1], _customerId, _helperId, Today.AddDays(9), AppointmentStatus.Confirmed);

        var page = Ok(await _api.Get($"/api/v1/treatments?customerId={_customerId}&pageSize=100", _helper));

        Ids(page).Count(id => id == plan.PlanId).Should().Be(1);
        page.GetProperty("totalCount").GetInt32().Should().Be(Ids(page).Count);
    }

    [Fact]
    public async Task TrtT23_DetailSessionsSkinProfilesCareHistory()
    {
        var plan = await _api.SeedPlanAsync(_customerId,
            [TreatmentSessionStatus.Completed, TreatmentSessionStatus.Booked, TreatmentSessionStatus.NotBooked], primaryStaffId: _leadId);
        var noShow = await _api.SeedVisitAsync(plan.Sessions[0], _customerId, _leadId, Today.AddDays(-20), AppointmentStatus.NoShow);
        var done = await _api.SeedVisitAsync(plan.Sessions[0], _customerId, _leadId, Today.AddDays(-10), AppointmentStatus.Completed);
        await _api.SeedVisitAsync(plan.Sessions[1], _customerId, _helperId, Today.AddDays(2), AppointmentStatus.Confirmed);
        var care = new Care.CareApi(_factory, _postgres);
        var profile = await care.SeedSkinProfileAsync(done, _leadId);
        var single = await _api.Staff.SeedAppointmentAsync(_leadId, Today.AddDays(-5), At(9), At(10), AppointmentStatus.Completed, customerId: _customerId);
        await care.SeedSkinProfileAsync(single, _leadId);
        await care.SeedAllergyAsync(_customerId, "Paraben", AllergySeverity.Mild);

        var detail = Ok(await _api.Get(P(plan.PlanId), _owner));

        detail.GetProperty("sessions")[0].GetProperty("appointment").GetProperty("id").GetGuid().Should().Be(done.Id);
        detail.GetProperty("sessions")[1].GetProperty("appointment").GetProperty("status").GetString().Should().Be("confirmed");
        detail.GetProperty("skinProfiles").EnumerateArray().Select(item => item.GetProperty("id").GetGuid()).Should().Equal(profile.Id);
        var history = detail.GetProperty("careHistory").EnumerateArray().ToList();
        history.Select(item => item.GetProperty("appointmentId").GetGuid()).Should().Equal(noShow.Id, done.Id);
        history[1].GetProperty("result").GetString().Should().Be("Kết quả buổi 1");
        history[1].GetProperty("skinProfileId").GetGuid().Should().Be(profile.Id);
        history[0].GetProperty("result").ValueKind.Should().Be(JsonValueKind.Null);
        detail.GetProperty("hasAllergies").GetBoolean().Should().BeTrue();
        detail.GetProperty("note").GetString().Should().Be("Ghi chú nội bộ");
        detail.GetProperty("canManage").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task TrtT24_UpdateDetails()
    {
        var plan = await SharedPlanAsync();
        var end = D(Today.AddDays(60));

        var owner = Ok(await _api.Put(P(plan.PlanId), new { goal = "Giảm mụn viêm", expectedEndDate = end, note = "Theo dõi" }, _owner));
        owner.GetProperty("goal").GetString().Should().Be("Giảm mụn viêm");
        owner.GetProperty("expectedEndDate").GetString().Should().Be(end);
        Ok(await _api.Put(P(plan.PlanId), new { goal = "Đều màu da", expectedEndDate = end, note = (string?)null }, _lead))
            .GetProperty("note").ValueKind.Should().Be(JsonValueKind.Null);
        ShouldFail(await _api.Put(P(plan.PlanId), new { goal = "x" }, _helper), HttpStatusCode.Forbidden, "treatment_not_in_charge");
        ShouldFail(await _api.Put(P(plan.PlanId), new { goal = new string('a', 2001) }, _owner), HttpStatusCode.BadRequest);
        ShouldFail(await _api.Put(P(plan.PlanId), new { expectedEndDate = D(Today.AddDays(-11)) }, _owner), HttpStatusCode.BadRequest);

        var closed = await _api.SeedPlanAsync(_customerId, [TreatmentSessionStatus.Completed], planStatus: TreatmentPlanStatus.Completed);
        ShouldFail(await _api.Put(P(closed.PlanId), new { goal = "x" }, _owner), HttpStatusCode.Conflict, "treatment_status_invalid");
    }

    [Fact]
    public async Task TrtT25_SessionNotes()
    {
        var plan = await SharedPlanAsync();

        Ok(await _api.Put(P(plan.PlanId, $"/sessions/{plan.Sessions[2].Id}"), new { note = "Dặn dùng kem chống nắng" }, _lead))
            .GetProperty("note").GetString().Should().Be("Dặn dùng kem chống nắng");
        ShouldFail(await _api.Put(P(plan.PlanId, $"/sessions/{plan.Sessions[0].Id}"), new { note = "x" }, _lead), HttpStatusCode.Conflict,
            "treatment_session_completed");
        Ok(await _api.Put(P(plan.PlanId, $"/sessions/{plan.Sessions[0].Id}"), new { note = "Sửa kết quả" }, _owner))
            .GetProperty("note").GetString().Should().Be("Sửa kết quả");
        var other = await _api.SeedPlanAsync(_customerId, [TreatmentSessionStatus.NotBooked]);
        ShouldFail(await _api.Put(P(plan.PlanId, $"/sessions/{other.Sessions[0].Id}"), new { note = "x" }, _owner), HttpStatusCode.NotFound,
            "treatment_session_not_found");
        var cancelled = await _api.SeedPlanAsync(_customerId, [TreatmentSessionStatus.NotBooked], planStatus: TreatmentPlanStatus.Cancelled);
        ShouldFail(await _api.Put(P(cancelled.PlanId, $"/sessions/{cancelled.Sessions[0].Id}"), new { note = "x" }, _owner), HttpStatusCode.Conflict,
            "treatment_status_invalid");
    }

    [Fact]
    public async Task TrtT26_AssignStaff()
    {
        var plan = await _api.SeedPlanAsync(_customerId, [TreatmentSessionStatus.NotBooked]);
        var resigned = await _api.Staff.SeedStaffAsync("Hoa");
        await using (var context = _api.Db())
        {
            var staff = await context.StaffMembers.FindAsync(resigned.Id);
            staff!.Resign(Today);
            await context.SaveChangesAsync();
        }

        Ok(await _api.Post(P(plan.PlanId, "/assign-staff"), new { staffMemberId = _helperId }, _owner))
            .GetProperty("primaryStaff").GetProperty("id").GetGuid().Should().Be(_helperId);
        Ok(await _api.Get(P(plan.PlanId), _helper)).GetProperty("canEdit").GetBoolean().Should().BeTrue();
        Ok(await _api.Post(P(plan.PlanId, "/assign-staff"), new { staffMemberId = (Guid?)null }, _owner))
            .GetProperty("primaryStaff").ValueKind.Should().Be(JsonValueKind.Null);
        ShouldFail(await _api.Post(P(plan.PlanId, "/assign-staff"), new { staffMemberId = resigned.Id }, _owner), HttpStatusCode.BadRequest,
            "staff_resigned");
        ShouldFail(await _api.Post(P(plan.PlanId, "/assign-staff"), new { staffMemberId = Guid.NewGuid() }, _owner), HttpStatusCode.NotFound,
            "staff_not_found");
        ShouldFail(await _api.Post(P(plan.PlanId, "/assign-staff"), new { staffMemberId = _leadId }, _lead), HttpStatusCode.Forbidden, "forbidden");
    }

    [Fact]
    public async Task TrtT27_PauseAndResume()
    {
        var (customer, customerId) = await _api.Booking.LoginCustomerAsync();
        var plan = await _api.SeedPlanAsync(customerId, [TreatmentSessionStatus.Completed, TreatmentSessionStatus.Booked, TreatmentSessionStatus.NotBooked]);
        var visit = await _api.SeedVisitAsync(plan.Sessions[1], customerId, _leadId, Today.AddDays(-1), AppointmentStatus.Confirmed);
        var staff = await _api.Booking.SeedQualifiedStaffAsync("An", plan.Service.Id, (Today.AddDays(3), 8, 17));

        var paused = Ok(await _api.Post(P(plan.PlanId, "/pause"), new { reason = "  Khách đang điều trị da liễu " }, _owner));
        paused.GetProperty("status").GetString().Should().Be("paused");
        paused.GetProperty("statusReason").GetString().Should().Be("Khách đang điều trị da liễu");
        ShouldFail(await new CustomerBookingFacade(_api, customer).BookAsync(plan.Sessions[2].Id, Today.AddDays(3), staff.Id), HttpStatusCode.Conflict,
            "entitlement_not_eligible");
        (await _api.Post($"/api/v1/appointments/{visit.Id}/complete", new { result = "Ổn" }, _lead)).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        ShouldFail(await _api.Post(P(plan.PlanId, "/pause"), new { reason = "x" }, _owner), HttpStatusCode.Conflict, "treatment_status_invalid");
        ShouldFail(await _api.Post(P(plan.PlanId, "/pause"), new { reason = " " }, _owner), HttpStatusCode.BadRequest);

        var resumed = Ok(await _api.Post(P(plan.PlanId, "/resume"), new { }, _owner));
        resumed.GetProperty("status").GetString().Should().Be("in_progress");
        resumed.GetProperty("statusReason").ValueKind.Should().Be(JsonValueKind.Null);

        var fresh = await _api.SeedPlanAsync(customerId, [TreatmentSessionStatus.NotBooked], planStatus: TreatmentPlanStatus.Paused);
        Ok(await _api.Post(P(fresh.PlanId, "/resume"), new { }, _owner)).GetProperty("status").GetString().Should().Be("not_started");
        var done = await _api.SeedPlanAsync(customerId, [TreatmentSessionStatus.Completed], planStatus: TreatmentPlanStatus.Completed);
        ShouldFail(await _api.Post(P(done.PlanId, "/pause"), new { reason = "x" }, _owner), HttpStatusCode.Conflict, "treatment_status_invalid");
    }

    [Fact]
    public async Task ResumeAfterAutoCompleteIsConflict()
    {
        var plan = await _api.SeedPlanAsync(_customerId, [TreatmentSessionStatus.Completed, TreatmentSessionStatus.Booked],
            planStatus: TreatmentPlanStatus.Paused);
        var visit = await _api.SeedVisitAsync(plan.Sessions[1], _customerId, _leadId, Today.AddDays(-1), AppointmentStatus.Confirmed);

        (await _api.Post($"/api/v1/appointments/{visit.Id}/complete", new { }, _lead)).Response.StatusCode.Should().Be(HttpStatusCode.OK);

        ShouldFail(await _api.Post(P(plan.PlanId, "/resume"), new { }, _owner), HttpStatusCode.Conflict, "treatment_status_invalid");
        Ok(await _api.Get(P(plan.PlanId), _owner)).GetProperty("status").GetString().Should().Be("completed");
    }

    [Fact]
    public async Task TrtT28_Cancel()
    {
        var (customer, customerId) = await _api.Booking.LoginCustomerAsync();
        var plan = await _api.SeedPlanAsync(customerId, [TreatmentSessionStatus.Completed, TreatmentSessionStatus.Booked, TreatmentSessionStatus.NotBooked]);
        var visit = await _api.SeedVisitAsync(plan.Sessions[1], customerId, _leadId, Today.AddDays(2), AppointmentStatus.Confirmed);

        ShouldFail(await _api.Post(P(plan.PlanId, "/cancel"), new { reason = "Khách chuyển nơi ở" }, _owner), HttpStatusCode.Conflict,
            "treatment_has_booked_sessions");
        (await _api.Post($"/api/v1/appointments/{visit.Id}/cancel", new { reason = "Khách chuyển nơi ở" }, _owner)).Response.IsSuccessStatusCode
            .Should().BeTrue();
        var cancelled = Ok(await _api.Post(P(plan.PlanId, "/cancel"), new { reason = "Khách chuyển nơi ở" }, _owner));

        cancelled.GetProperty("status").GetString().Should().Be("cancelled");
        cancelled.GetProperty("packageStatus").GetString().Should().Be("cancelled");
        var purchases = Ok(await _api.Get($"/api/v1/me/purchases/packages/{plan.PackageId}", customer));
        purchases.GetProperty("status").GetString().Should().Be("cancelled");
        purchases.GetProperty("nextSession").GetProperty("canBook").GetBoolean().Should().BeFalse();
        ShouldFail(await _api.Post(P(plan.PlanId, "/cancel"), new { reason = "x" }, _owner), HttpStatusCode.Conflict, "treatment_status_invalid");
    }

    [Fact]
    public async Task TrtT29_CloseWithSkippedSessions()
    {
        var plan = await _api.SeedPlanAsync(_customerId,
            [TreatmentSessionStatus.Completed, TreatmentSessionStatus.Completed, TreatmentSessionStatus.Skipped]);
        await _api.SeedVisitAsync(plan.Sessions[0], _customerId, _leadId, Today.AddDays(-14), AppointmentStatus.Completed);
        await _api.SeedVisitAsync(plan.Sessions[1], _customerId, _leadId, Today.AddDays(-7), AppointmentStatus.Completed);
        var open = await _api.SeedPlanAsync(_customerId, [TreatmentSessionStatus.Completed, TreatmentSessionStatus.NotBooked]);
        var notStarted = await _api.SeedPlanAsync(_customerId, [TreatmentSessionStatus.Skipped], planStatus: TreatmentPlanStatus.NotStarted);

        var closed = Ok(await _api.Post(P(plan.PlanId, "/complete"), new { }, _owner));

        closed.GetProperty("status").GetString().Should().Be("completed");
        closed.GetProperty("packageStatus").GetString().Should().Be("completed");
        closed.GetProperty("actualEndDate").GetString().Should().Be(D(Today.AddDays(-7)));
        ShouldFail(await _api.Post(P(open.PlanId, "/complete"), new { }, _owner), HttpStatusCode.Conflict, "treatment_sessions_remaining");
        ShouldFail(await _api.Post(P(notStarted.PlanId, "/complete"), new { }, _owner), HttpStatusCode.Conflict, "treatment_status_invalid");
        await using var context = _api.Db();
        (await context.CustomerPackages.SingleAsync(package => package.Id == plan.PackageId)).UsedSessions.Should().Be(2);
    }

    [Fact]
    public async Task TrtT31_Authorization()
    {
        var plan = await SharedPlanAsync();
        var (customer, _) = await _api.Booking.LoginCustomerAsync();
        string[] customerRoutes = ["/api/v1/me/treatments", $"/api/v1/me/treatments/{plan.PlanId}", "/api/v1/me/service-history"];

        foreach (var route in customerRoutes.Concat(["/api/v1/treatments", P(plan.PlanId)]))
            (await _api.Api.GetAsync(route)).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized, route);
        (await _api.Post(P(plan.PlanId, "/pause"), new { reason = "x" }, null!)).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        foreach (var route in customerRoutes)
        {
            ShouldFail(await _api.Get(route, _lead), HttpStatusCode.Forbidden);
            ShouldFail(await _api.Get(route, _owner), HttpStatusCode.Forbidden);
        }
        ShouldFail(await _api.Get("/api/v1/treatments", customer), HttpStatusCode.Forbidden);
        ShouldFail(await _api.Put(P(plan.PlanId), new { goal = "x" }, customer), HttpStatusCode.Forbidden);
        foreach (var command in new[] { "/pause", "/cancel", "/resume", "/complete" })
            ShouldFail(await _api.Post(P(plan.PlanId, command), new { reason = "x" }, _lead), HttpStatusCode.Forbidden, "forbidden");
        ShouldFail(await _api.Post(P(plan.PlanId, "/assign-staff"), new { staffMemberId = _leadId }, _lead), HttpStatusCode.Forbidden, "forbidden");
    }
}
