using System.Net;
using System.Text.Json;
using FluentAssertions;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Care;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Bookings.BookingApi;
using static NhuNguyetSpa.IntegrationTests.Care.CareApi;

namespace NhuNguyetSpa.IntegrationTests.Staff;

/// <summary>UC-SPA-25 <c>GET /me/assigned-appointments</c> (docs/specs/staff.md STF-T31..T34).</summary>
[Collection(PostgresCollection.Name)]
public sealed class AssignedAppointmentsEndpointsTests : IAsyncLifetime
{
    private const string Path = "/api/v1/me/assigned-appointments";
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CareApi _care = null!;
    private string _staff = null!;
    private Guid _staffId;

    public AssignedAppointmentsEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    private DateOnly Day => _care.Today.AddDays(1);

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

    private Task<(HttpResponseMessage Response, JsonDocument Body)> List(string query, string? bearer = null) =>
        _care.Api.GetAsync($"{Path}?{query}", bearer ?? _staff);

    [Fact]
    public async Task StfT31_OnlyOwnAndNotHeld()
    {
        var afternoon = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Completed, Day, At(14));
        var morning = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, Day, At(9));
        var cancelled = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Cancelled, Day, At(11));
        await _care.SeedVisitAsync(_staffId, AppointmentStatus.Held, Day, At(16), source: AppointmentSource.OrderItem);
        await _care.SeedVisitAsync(_staffId, AppointmentStatus.HoldExpired, Day, At(17), source: AppointmentSource.OrderItem);
        var (_, otherId) = await _care.Booking.LoginStaffAsync();
        await _care.SeedVisitAsync(otherId, AppointmentStatus.Confirmed, Day, At(10));

        var (response, body) = await List($"fromDate={D(Day)}&toDate={D(Day)}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var rows = CatalogApi.Data(body);
        rows.EnumerateArray().Select(row => row.GetProperty("id").GetGuid()).Should().Equal(morning.Id, cancelled.Id, afternoon.Id);
        rows[0].GetProperty("service").GetProperty("name").GetString().Should().NotBeNullOrEmpty();
        rows[0].GetProperty("customer").GetProperty("id").GetGuid().Should().Be(morning.CustomerId);
    }

    [Fact]
    public async Task StfT32_StatusFilterAndFlags()
    {
        var (visit, _, _) = await _care.SeedPackageVisitAsync(_staffId, total: 4, sequence: 2, Day);
        await _care.SeedAllergyAsync(visit.CustomerId, "Paraben", AllergySeverity.Severe);
        await _care.SeedSkinProfileAsync(visit, _staffId);
        var done = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Completed, Day, At(15));

        var (_, all) = await List($"fromDate={D(Day)}&toDate={D(Day)}");
        var (_, completed) = await List($"fromDate={D(Day)}&toDate={D(Day)}&status=completed");

        var row = CatalogApi.Data(all).EnumerateArray().Single(item => item.GetProperty("id").GetGuid() == visit.Id);
        row.GetProperty("hasAllergies").GetBoolean().Should().BeTrue();
        row.GetProperty("hasSkinProfile").GetBoolean().Should().BeTrue();
        row.GetProperty("treatmentSession").GetProperty("sequenceNumber").GetInt32().Should().Be(2);
        row.GetProperty("treatmentSession").GetProperty("totalSessions").GetInt32().Should().Be(4);
        row.GetProperty("treatmentSession").GetProperty("packageName").GetString().Should().Be("Gói trị mụn");
        CatalogApi.Data(completed).EnumerateArray().Select(item => item.GetProperty("id").GetGuid()).Should().Equal(done.Id);
        CatalogApi.Data(completed)[0].GetProperty("hasAllergies").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task StfT33_Validation()
    {
        ShouldFail(await List($"toDate={D(Day)}"), HttpStatusCode.BadRequest);
        ShouldFail(await List($"fromDate={D(Day)}&toDate={D(Day.AddDays(-1))}"), HttpStatusCode.BadRequest);
        ShouldFail(await List($"fromDate={D(Day)}&toDate={D(Day.AddDays(42))}"), HttpStatusCode.BadRequest);
        ShouldFail(await List($"fromDate={D(Day)}&toDate={D(Day)}&status=held"), HttpStatusCode.BadRequest);
        ShouldFail(await List($"fromDate={D(Day)}&toDate={D(Day)}&status=abc"), HttpStatusCode.BadRequest);

        var (response, body) = await List($"fromDate={D(Day.AddDays(30))}&toDate={D(Day.AddDays(30))}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(body).GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task StfT34_OnlyStaff()
    {
        var owner = await _care.Api.LoginAsync(UserRole.Owner);
        var (customer, _) = await _care.Booking.LoginCustomerAsync();
        var query = $"fromDate={D(Day)}&toDate={D(Day)}";

        ShouldFail(await List(query, owner), HttpStatusCode.Forbidden);
        ShouldFail(await List(query, customer), HttpStatusCode.Forbidden);
        ShouldFail(await _care.Api.GetAsync($"{Path}?{query}"), HttpStatusCode.Unauthorized);
    }
}
