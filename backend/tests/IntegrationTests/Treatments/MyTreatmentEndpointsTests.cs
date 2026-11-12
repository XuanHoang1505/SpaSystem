using System.Net;
using System.Text.Json;
using FluentAssertions;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Bookings.BookingApi;
using static NhuNguyetSpa.IntegrationTests.Treatments.TreatmentApi;

namespace NhuNguyetSpa.IntegrationTests.Treatments;

/// <summary>UC-SPA-19 (docs/specs/purchases-treatments.md TRT-T12…T17).</summary>
[Collection(PostgresCollection.Name)]
public sealed class MyTreatmentEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private TreatmentApi _api = null!;
    private string _customer = null!;
    private Guid _customerId;
    private Guid _staffId;

    public MyTreatmentEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    private DateOnly Today => _api.Today;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new TreatmentApi(_factory, _postgres);
        (_customer, _customerId) = await _api.Booking.LoginCustomerAsync();
        _staffId = (await _api.Staff.SeedStaffAsync("Lan")).Id;
    }

    public async Task DisposeAsync()
    {
        _api.Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private static TreatmentSessionStatus[] Statuses(params TreatmentSessionStatus[] statuses) => statuses;

    /// <summary>TRT-T12 data: 1 completed (yesterday), 1 booked (confirmed in 3 days), 2 not booked; gap 7 days.</summary>
    private async Task<SeededPlan> FourSessionPlanAsync()
    {
        var plan = await _api.SeedPlanAsync(_customerId, Statuses(TreatmentSessionStatus.Completed, TreatmentSessionStatus.Booked,
            TreatmentSessionStatus.NotBooked, TreatmentSessionStatus.NotBooked), minDaysBetweenSessions: 7);
        await _api.SeedVisitAsync(plan.Sessions[0], _customerId, _staffId, Today.AddDays(-1), AppointmentStatus.Completed);
        await _api.SeedVisitAsync(plan.Sessions[1], _customerId, _staffId, Today.AddDays(3), AppointmentStatus.Confirmed);
        return plan;
    }

    [Fact]
    public async Task TrtT12_ProgressAndSessionsInOrder()
    {
        var plan = await FourSessionPlanAsync();

        var list = Ok(await _api.Get("/api/v1/me/treatments", _customer));
        var row = list.EnumerateArray().Single();
        row.GetProperty("usedSessions").GetInt32().Should().Be(1);
        row.GetProperty("bookedSessions").GetInt32().Should().Be(1);
        row.GetProperty("nextSession").GetProperty("sequenceNumber").GetInt32().Should().Be(3);

        var detail = Ok(await _api.Get($"/api/v1/me/treatments/{plan.PlanId}", _customer));
        var sessions = detail.GetProperty("sessions").EnumerateArray().ToList();
        sessions.Select(session => session.GetProperty("sequenceNumber").GetInt32()).Should().Equal(1, 2, 3, 4);
        sessions[1].GetProperty("appointment").GetProperty("staff").GetProperty("fullName").GetString().Should().Be("Lan");
        sessions[2].GetProperty("canBook").GetBoolean().Should().BeTrue();
        sessions[2].GetProperty("earliestDate").GetString().Should().Be(D(Today.AddDays(3 + 7)));
        sessions[3].GetProperty("canBook").GetBoolean().Should().BeFalse();
        sessions[3].GetProperty("reason").GetString().Should().Be("Cần đặt lịch các buổi trước theo thứ tự.");
    }

    [Fact]
    public async Task TrtT13_CanBookMatchesBooking()
    {
        var plan = await _api.SeedPlanAsync(_customerId, Statuses(TreatmentSessionStatus.Completed, TreatmentSessionStatus.NotBooked,
            TreatmentSessionStatus.NotBooked), minDaysBetweenSessions: 7);
        await _api.SeedVisitAsync(plan.Sessions[0], _customerId, _staffId, Today.AddDays(-1), AppointmentStatus.Completed);
        var earliest = Today.AddDays(6);
        var staff = await _api.Booking.SeedQualifiedStaffAsync("An", plan.Service.Id, (earliest.AddDays(-1), 8, 17), (earliest, 8, 17));
        var booking = new CustomerBookingFacade(_api, _customer);

        var detail = Ok(await _api.Get($"/api/v1/me/treatments/{plan.PlanId}", _customer));
        detail.GetProperty("sessions")[1].GetProperty("earliestDate").GetString().Should().Be(D(earliest));

        ShouldFail(await booking.BookAsync(plan.Sessions[1].Id, earliest.AddDays(-1), staff.Id), HttpStatusCode.BadRequest, "session_too_early");
        ShouldFail(await booking.BookAsync(plan.Sessions[2].Id, earliest, staff.Id), HttpStatusCode.Conflict, "entitlement_not_eligible");
        (await booking.BookAsync(plan.Sessions[1].Id, earliest, staff.Id)).Response.IsSuccessStatusCode.Should().BeTrue();
    }

    [Fact]
    public async Task TrtT14_PausedPlanAndExpiredPackage()
    {
        var paused = await _api.SeedPlanAsync(_customerId, Statuses(TreatmentSessionStatus.NotBooked), planStatus: TreatmentPlanStatus.Paused);
        await using (var context = _api.Db())
        {
            var plan = await context.TreatmentPlans.FindAsync(paused.PlanId);
            plan!.StatusReason = "Khách đang điều trị da liễu";
            await context.SaveChangesAsync();
        }
        var expired = await _api.SeedPlanAsync(_customerId, Statuses(TreatmentSessionStatus.NotBooked), expiresAtUtc: _factory.Clock.UtcNow.AddMinutes(-1));

        var pausedDetail = Ok(await _api.Get($"/api/v1/me/treatments/{paused.PlanId}", _customer));
        var expiredDetail = Ok(await _api.Get($"/api/v1/me/treatments/{expired.PlanId}", _customer));

        pausedDetail.GetProperty("statusReason").GetString().Should().Be("Khách đang điều trị da liễu");
        pausedDetail.GetProperty("sessions")[0].GetProperty("canBook").GetBoolean().Should().BeFalse();
        expiredDetail.GetProperty("packageStatus").GetString().Should().Be("expired");
        expiredDetail.GetProperty("sessions")[0].GetProperty("canBook").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task TrtT15_CompletedSessionShowsResultNotInternals()
    {
        var plan = await FourSessionPlanAsync();

        var session = Ok(await _api.Get($"/api/v1/me/treatments/{plan.PlanId}/sessions/{plan.Sessions[0].Id}", _customer));
        var detail = Ok(await _api.Get($"/api/v1/me/treatments/{plan.PlanId}", _customer));

        session.GetProperty("result").GetString().Should().Be("Kết quả buổi 1");
        session.GetProperty("skinProfile").ValueKind.Should().Be(JsonValueKind.Null);
        detail.TryGetProperty("note", out _).Should().BeFalse();
    }

    [Fact]
    public async Task TrtT16_FilterInvalidAndEmpty()
    {
        var (fresh, _) = await _api.Booking.LoginCustomerAsync();
        Ok(await _api.Get("/api/v1/me/treatments", fresh)).GetArrayLength().Should().Be(0);

        await _api.SeedPlanAsync(_customerId, Statuses(TreatmentSessionStatus.NotBooked), planStatus: TreatmentPlanStatus.NotStarted);
        await _api.SeedPlanAsync(_customerId, Statuses(TreatmentSessionStatus.Completed, TreatmentSessionStatus.NotBooked));

        var inProgress = Ok(await _api.Get("/api/v1/me/treatments?status=in_progress", _customer));
        inProgress.EnumerateArray().Select(row => row.GetProperty("status").GetString()).Should().AllBe("in_progress").And.HaveCount(1);
        ShouldFail(await _api.Get("/api/v1/me/treatments?status=abc", _customer), HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task TrtT17_OtherCustomersPlanIsNotFound()
    {
        var (other, otherId) = await _api.Booking.LoginCustomerAsync();
        var theirs = await _api.SeedPlanAsync(otherId, Statuses(TreatmentSessionStatus.NotBooked));
        var mine = await _api.SeedPlanAsync(_customerId, Statuses(TreatmentSessionStatus.NotBooked));

        ShouldFail(await _api.Get($"/api/v1/me/treatments/{theirs.PlanId}", _customer), HttpStatusCode.NotFound, "treatment_plan_not_found");
        ShouldFail(await _api.Get($"/api/v1/me/treatments/{theirs.PlanId}/sessions/{theirs.Sessions[0].Id}", _customer), HttpStatusCode.NotFound,
            "treatment_plan_not_found");
        ShouldFail(await _api.Get($"/api/v1/me/treatments/{mine.PlanId}/sessions/{theirs.Sessions[0].Id}", _customer), HttpStatusCode.NotFound,
            "treatment_session_not_found");
        Ok(await _api.Get("/api/v1/me/treatments", other)).EnumerateArray().Select(row => row.GetProperty("id").GetGuid())
            .Should().Equal(theirs.PlanId);
    }
}

/// <summary>Books a package session as the customer (UC-SPA-15 flow 2) at 09:00.</summary>
internal sealed class CustomerBookingFacade(TreatmentApi api, string token)
{
    public Task<(HttpResponseMessage Response, JsonDocument Body)> BookAsync(Guid sessionId, DateOnly date, Guid staffId) =>
        api.Post("/api/v1/me/appointments",
            new { treatmentSessionId = sessionId, date = D(date), startTime = "09:00", staffMemberId = staffId }, token);
}
