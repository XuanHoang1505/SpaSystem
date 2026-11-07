using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Staff;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Bookings.BookingApi;
using static NhuNguyetSpa.IntegrationTests.Treatments.TreatmentApi;

namespace NhuNguyetSpa.IntegrationTests.Treatments;

/// <summary>UC-SPA-20 (docs/specs/purchases-treatments.md TRT-T18…T20, Q-40: completed and no-show visits).</summary>
[Collection(PostgresCollection.Name)]
public sealed class ServiceHistoryEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private TreatmentApi _api = null!;
    private string _customer = null!;
    private Guid _customerId;
    private Guid _staffId;
    private SpaService _facial = null!;
    private SpaService _massage = null!;

    public ServiceHistoryEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    private DateOnly Today => _api.Today;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new TreatmentApi(_factory, _postgres);
        (_customer, _customerId) = await _api.Booking.LoginCustomerAsync();
        _staffId = (await _api.Staff.SeedStaffAsync("Lan")).Id;
        _facial = await _api.Api.SeedServiceAsync("Chăm sóc da " + Guid.NewGuid().ToString("N")[..6]);
        _massage = await _api.Api.SeedServiceAsync("Massage " + Guid.NewGuid().ToString("N")[..6]);
    }

    public async Task DisposeAsync()
    {
        _api.Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private async Task<Appointment> SingleAsync(SpaService service, DateOnly date, AppointmentStatus status, string? note = null,
        AppointmentSource source = AppointmentSource.Entitlement)
    {
        var visit = await _api.Staff.SeedAppointmentAsync(_staffId, date, At(9), At(10), status, spaServiceId: service.Id, customerId: _customerId,
            source: source);
        if (note is not null)
        {
            await using var context = _api.Db();
            await context.Appointments.Where(appointment => appointment.Id == visit.Id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(appointment => appointment.Note, note));
        }
        return visit;
    }

    /// <summary>TRT-T18 data: 3 completed (facial, massage, package session of facial), confirmed, no-show, cancelled.</summary>
    private async Task<(Appointment Facial, Appointment Massage, Appointment PackageVisit, Appointment NoShow, Appointment Confirmed)> SeedHistoryAsync()
    {
        var facial = await SingleAsync(_facial, Today.AddDays(-30), AppointmentStatus.Completed, "Da sáng hơn");
        var massage = await SingleAsync(_massage, Today.AddDays(-20), AppointmentStatus.Completed);
        var plan = await _api.SeedPlanAsync(_customerId, [TreatmentSessionStatus.Completed, TreatmentSessionStatus.NotBooked], service: _facial);
        var packageVisit = await _api.SeedVisitAsync(plan.Sessions[0], _customerId, _staffId, Today.AddDays(-10), AppointmentStatus.Completed);
        var noShow = await SingleAsync(_massage, Today.AddDays(-5), AppointmentStatus.NoShow);
        var confirmed = await SingleAsync(_massage, Today.AddDays(3), AppointmentStatus.Confirmed);
        await SingleAsync(_facial, Today.AddDays(-2), AppointmentStatus.Cancelled);
        return (facial, massage, packageVisit, noShow, confirmed);
    }

    private static List<Guid> Ids(JsonElement page) =>
        page.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("appointmentId").GetGuid()).ToList();

    [Fact]
    public async Task TrtT18_CompletedAndNoShowNewestFirst()
    {
        var seeded = await SeedHistoryAsync();

        var page = Ok(await _api.Get("/api/v1/me/service-history", _customer));

        Ids(page).Should().Equal(seeded.NoShow.Id, seeded.PackageVisit.Id, seeded.Massage.Id, seeded.Facial.Id);
        var items = page.GetProperty("items").EnumerateArray().ToList();
        items[0].GetProperty("status").GetString().Should().Be("no_show");
        items[1].GetProperty("source").GetString().Should().Be("package");
        items[1].GetProperty("sequenceNumber").GetInt32().Should().Be(1);
        items[1].GetProperty("packageName").GetString().Should().StartWith("Gói ");
        items[2].GetProperty("source").GetString().Should().Be("service");
        items[2].GetProperty("staff").GetProperty("fullName").GetString().Should().Be("Lan");

        Ids(Ok(await _api.Get("/api/v1/me/service-history?status=no_show", _customer))).Should().Equal(seeded.NoShow.Id);
        ShouldFail(await _api.Get("/api/v1/me/service-history?status=cancelled", _customer), HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task TrtT19_FiltersAndPaging()
    {
        var seeded = await SeedHistoryAsync();

        var range = Ok(await _api.Get($"/api/v1/me/service-history?fromDate={D(Today.AddDays(-20))}&toDate={D(Today.AddDays(-10))}", _customer));
        Ids(range).Should().Equal(seeded.PackageVisit.Id, seeded.Massage.Id);

        var facial = Ok(await _api.Get($"/api/v1/me/service-history?spaServiceId={_facial.Id}", _customer));
        Ids(facial).Should().Equal(seeded.PackageVisit.Id, seeded.Facial.Id);

        ShouldFail(await _api.Get($"/api/v1/me/service-history?fromDate={D(Today)}&toDate={D(Today.AddDays(-1))}", _customer),
            HttpStatusCode.BadRequest);

        var first = Ok(await _api.Get("/api/v1/me/service-history?pageSize=2", _customer));
        first.GetProperty("totalCount").GetInt32().Should().Be(4);
        first.GetProperty("totalPages").GetInt32().Should().Be(2);
        Ids(Ok(await _api.Get("/api/v1/me/service-history?pageSize=2&pageNumber=2", _customer))).Should().Equal(seeded.Massage.Id, seeded.Facial.Id);
    }

    [Fact]
    public async Task TrtT20_DetailResultAndScope()
    {
        var seeded = await SeedHistoryAsync();
        var (other, otherId) = await _api.Booking.LoginCustomerAsync();

        var single = Ok(await _api.Get($"/api/v1/me/service-history/{seeded.Facial.Id}", _customer));
        var package = Ok(await _api.Get($"/api/v1/me/service-history/{seeded.PackageVisit.Id}", _customer));
        var noShow = Ok(await _api.Get($"/api/v1/me/service-history/{seeded.NoShow.Id}", _customer));

        single.GetProperty("result").GetString().Should().Be("Da sáng hơn");
        single.GetProperty("order").GetProperty("code").GetString().Should().StartWith("DH");
        package.GetProperty("result").GetString().Should().Be("Kết quả buổi 1");
        package.GetProperty("treatmentSessionId").GetGuid().Should().NotBeEmpty();
        noShow.GetProperty("result").ValueKind.Should().Be(JsonValueKind.Null);
        ShouldFail(await _api.Get($"/api/v1/me/service-history/{seeded.Confirmed.Id}", _customer), HttpStatusCode.NotFound, "appointment_not_found");
        ShouldFail(await _api.Get($"/api/v1/me/service-history/{seeded.Facial.Id}", other), HttpStatusCode.NotFound, "appointment_not_found");
        otherId.Should().NotBe(_customerId);
    }

    [Fact]
    public async Task HistoryFilterMatchesBookNowVisit()
    {
        var bookNow = await SingleAsync(_massage, Today.AddDays(-3), AppointmentStatus.Completed, source: AppointmentSource.OrderItem);

        var page = Ok(await _api.Get($"/api/v1/me/service-history?spaServiceId={_massage.Id}", _customer));

        Ids(page).Should().Equal(bookNow.Id);
        page.GetProperty("items")[0].GetProperty("spaServiceId").GetGuid().Should().Be(_massage.Id);
    }
}
