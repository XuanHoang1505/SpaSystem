using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Staff;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Bookings.BookingApi;
using static NhuNguyetSpa.IntegrationTests.Care.CareApi;

namespace NhuNguyetSpa.IntegrationTests.Care;

/// <summary>UC-SPA-28 (docs/specs/care.md CARE-T14..T25). Visits are dated yesterday so they have started, whatever the hour.</summary>
[Collection(PostgresCollection.Name)]
public sealed class CompleteAppointmentEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CareApi _care = null!;
    private string _staff = null!;
    private Guid _staffId;

    public CompleteAppointmentEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    private DateOnly Yesterday => _care.Today.AddDays(-1);

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _care = new CareApi(_factory, _postgres);
        (_staff, _staffId) = await _care.Booking.LoginStaffAsync();
    }

    public async Task DisposeAsync()
    {
        _care.Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private Task<(HttpResponseMessage Response, JsonDocument Body)> Complete(Guid id, string? result = null, string? bearer = null) =>
        _care.Api.SendJsonAsync(HttpMethod.Post, $"/api/v1/appointments/{id}/complete", new { result }, bearer ?? _staff);

    [Fact]
    public async Task CareT14_SingleServiceCompletes()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, Yesterday);

        var (response, body) = await Complete(visit.Id, "Da sáng hơn");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("appointment").GetProperty("status").GetString().Should().Be("completed");
        data.GetProperty("appointment").GetProperty("note").GetString().Should().Be("Da sáng hơn");
        data.GetProperty("packageProgress").ValueKind.Should().Be(JsonValueKind.Null);
        await using var context = _care.Db();
        (await context.ServiceEntitlements.SingleAsync(item => item.Id == visit.ServiceEntitlementId)).Status.Should().Be(EntitlementStatus.Used);
    }

    [Fact]
    public async Task CompleteWithoutBodyIsAllowed()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, Yesterday);

        var (response, _) = await _care.Api.SendAsync(HttpMethod.Post, $"/api/v1/appointments/{visit.Id}/complete", null, _staff);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await _care.Booking.LoadAsync(visit.Id)).Status.Should().Be(AppointmentStatus.Completed);
    }

    [Fact]
    public async Task CareT15_PaidBookNowVisitCompletes()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, Yesterday);
        await using (var context = _care.Db())
        {
            var entitlement = await context.ServiceEntitlements.SingleAsync(item => item.Id == visit.ServiceEntitlementId);
            await context.Appointments.Where(item => item.Id == visit.Id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.OrderItemId, entitlement.OrderItemId));
        }

        (await Complete(visit.Id)).Response.StatusCode.Should().Be(HttpStatusCode.OK);

        await using var check = _care.Db();
        (await check.ServiceEntitlements.SingleAsync(item => item.Id == visit.ServiceEntitlementId)).Status.Should().Be(EntitlementStatus.Used);
    }

    [Fact]
    public async Task CareT16_FirstSessionStartsPlan()
    {
        var (visit, packageId, planId) = await _care.SeedPackageVisitAsync(_staffId, total: 3, sequence: 1, Yesterday);

        var (response, body) = await Complete(visit.Id, "Giảm mụn");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var progress = CatalogApi.Data(body).GetProperty("packageProgress");
        progress.GetProperty("usedSessions").GetInt32().Should().Be(1);
        progress.GetProperty("totalSessions").GetInt32().Should().Be(3);
        progress.GetProperty("status").GetString().Should().Be("active");
        await using var context = _care.Db();
        var session = await context.TreatmentSessions.SingleAsync(item => item.Id == visit.TreatmentSessionId);
        session.Status.Should().Be(TreatmentSessionStatus.Completed);
        session.Note.Should().Be("Giảm mụn");
        session.CompletedAtUtc.Should().NotBeNull();
        (await context.CustomerPackages.SingleAsync(item => item.Id == packageId)).UsedSessions.Should().Be(1);
        var plan = await context.TreatmentPlans.SingleAsync(item => item.Id == planId);
        plan.Status.Should().Be(TreatmentPlanStatus.InProgress);
        plan.StartDate.Should().Be(Yesterday);
    }

    [Fact]
    public async Task CareT17_LastSessionCompletesPackage()
    {
        var (visit, packageId, planId) = await _care.SeedPackageVisitAsync(
            _staffId, total: 3, sequence: 3, Yesterday, planStatus: TreatmentPlanStatus.InProgress,
            otherStatus: TreatmentSessionStatus.Completed, usedSessions: 2);

        var (_, body) = await Complete(visit.Id);

        CatalogApi.Data(body).GetProperty("packageProgress").GetProperty("status").GetString().Should().Be("completed");
        await using var context = _care.Db();
        var package = await context.CustomerPackages.SingleAsync(item => item.Id == packageId);
        package.Status.Should().Be(CustomerPackageStatus.Completed);
        package.UsedSessions.Should().Be(3);
        var plan = await context.TreatmentPlans.SingleAsync(item => item.Id == planId);
        plan.Status.Should().Be(TreatmentPlanStatus.Completed);
        plan.ActualEndDate.Should().Be(Yesterday);
    }

    [Fact]
    public async Task CompletingWithSkippedSessionKeepsPackageActive()
    {
        // Session 1 was skipped (Q-07 on): completing 2/2 leaves used = 1 < total.
        var (visit, packageId, _) = await _care.SeedPackageVisitAsync(
            _staffId, total: 2, sequence: 2, Yesterday, planStatus: TreatmentPlanStatus.InProgress, otherStatus: TreatmentSessionStatus.Skipped);

        (await Complete(visit.Id)).Response.StatusCode.Should().Be(HttpStatusCode.OK);

        await using var context = _care.Db();
        var package = await context.CustomerPackages.SingleAsync(item => item.Id == packageId);
        package.UsedSessions.Should().Be(1);
        package.Status.Should().Be(CustomerPackageStatus.Active);
    }

    [Fact]
    public async Task CareT18_NotBeforeStart()
    {
        var tomorrow = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today.AddDays(1));
        ShouldFail(await Complete(tomorrow.Id), HttpStatusCode.BadRequest, "complete_too_early");

        var started = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, Yesterday, At(22));
        (await Complete(started.Id)).Response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CareT19_OnlyConfirmed()
    {
        var hour = 6;
        foreach (var status in new[]
                 {
                     AppointmentStatus.Completed, AppointmentStatus.Cancelled, AppointmentStatus.NoShow, AppointmentStatus.Held,
                     AppointmentStatus.PendingConfirmation,
                 })
        {
            var visit = await _care.SeedVisitAsync(_staffId, status, Yesterday, At(hour += 2));
            ShouldFail(await Complete(visit.Id), HttpStatusCode.Conflict, "appointment_status_invalid");
        }
    }

    [Fact]
    public async Task CareT20_EntitlementState()
    {
        var used = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, Yesterday);
        await using (var context = _care.Db())
            await context.ServiceEntitlements.Where(item => item.Id == used.ServiceEntitlementId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Status, EntitlementStatus.Used));
        ShouldFail(await Complete(used.Id), HttpStatusCode.Conflict, "entitlement_state_invalid");

        var (cancelled, _, _) = await _care.SeedPackageVisitAsync(_staffId, 3, 1, Yesterday, At(11), packageStatus: CustomerPackageStatus.Cancelled);
        ShouldFail(await Complete(cancelled.Id), HttpStatusCode.Conflict, "entitlement_state_invalid");

        var (expiredPaused, _, _) = await _care.SeedPackageVisitAsync(
            _staffId, 3, 1, Yesterday, At(13), planStatus: TreatmentPlanStatus.Paused, expiresAtUtc: _factory.Clock.UtcNow.AddHours(-1));
        (await Complete(expiredPaused.Id)).Response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CareT21_Permissions()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, Yesterday);
        var (other, _) = await _care.Booking.LoginStaffAsync();
        var owner = await _care.Api.LoginAsync(UserRole.Owner);
        var (customer, _) = await _care.Booking.LoginCustomerAsync();

        ShouldFail(await Complete(visit.Id, bearer: other), HttpStatusCode.Forbidden, "appointment_not_assigned");
        ShouldFail(await Complete(visit.Id, bearer: owner), HttpStatusCode.Forbidden);
        ShouldFail(await Complete(visit.Id, bearer: customer), HttpStatusCode.Forbidden);
        ShouldFail(await _care.Api.SendJsonAsync(HttpMethod.Post, $"/api/v1/appointments/{visit.Id}/complete", new { }, null), HttpStatusCode.Unauthorized);
        ShouldFail(await Complete(Guid.NewGuid()), HttpStatusCode.NotFound, "appointment_not_found");
    }

    [Fact]
    public async Task ReassignedStaffCannotComplete()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, Yesterday);
        var (_, otherId) = await _care.Booking.LoginStaffAsync();
        await _care.ReassignAsync(visit.Id, otherId);

        ShouldFail(await Complete(visit.Id), HttpStatusCode.Forbidden, "appointment_not_assigned");
    }

    [Fact]
    public async Task CareT23_RequireSkinProfileSwitch()
    {
        await using var strict = _factory.WithWebHostBuilder(builder => builder.UseSetting("Care:RequireSkinProfileToComplete", "true"));
        using var client = strict.CreateClient();
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, Yesterday);

        async Task<HttpResponseMessage> Send()
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/appointments/{visit.Id}/complete")
            {
                Content = JsonContent.Create(new { result = (string?)null }),
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _staff);
            return await client.SendAsync(request);
        }

        var missing = await Send();
        missing.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await missing.Content.ReadAsStringAsync()).Should().Contain("skin_profile_required");

        await _care.SeedSkinProfileAsync(visit, _staffId);
        (await Send()).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CareT24_ResultTooLong()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, Yesterday);

        ShouldFail(await Complete(visit.Id, new string('a', 2001)), HttpStatusCode.BadRequest);

        (await _care.Booking.LoadAsync(visit.Id)).Status.Should().Be(AppointmentStatus.Confirmed);
    }

    [Fact]
    public async Task CareT25_PurchasesReflectCompletion()
    {
        var (customer, customerId) = await _care.Booking.LoginCustomerAsync();
        var single = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, Yesterday, customerId: customerId);
        var (session, packageId, _) = await _care.SeedPackageVisitAsync(_staffId, 3, 1, Yesterday, At(13), customerId: customerId);

        await Complete(single.Id);
        await Complete(session.Id);

        var (_, services) = await _care.Api.GetAsync($"/api/v1/me/purchases/services/{single.ServiceEntitlementId}", customer);
        CatalogApi.Data(services).GetProperty("status").GetString().Should().Be("used");
        CatalogApi.Data(services).GetProperty("canBook").GetBoolean().Should().BeFalse();
        var (_, package) = await _care.Api.GetAsync($"/api/v1/me/purchases/packages/{packageId}", customer);
        CatalogApi.Data(package).GetProperty("usedSessions").GetInt32().Should().Be(1);
        CatalogApi.Data(package).GetProperty("nextSession").GetProperty("sequenceNumber").GetInt32().Should().Be(2);
    }
}
