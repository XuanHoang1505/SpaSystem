using System.Net;
using System.Text.Json;
using FluentAssertions;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Bookings.BookingApi;

namespace NhuNguyetSpa.IntegrationTests.Bookings;

/// <summary>GET /availability against PostgreSQL (docs/specs/bookings.md BKG-T04, T06, T07, T09); slot step 30'.</summary>
[Collection(PostgresCollection.Name)]
public sealed class AvailabilityEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private BookingApi _booking = null!;

    public AvailabilityEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    private DateOnly Day => _booking.Staff.Today.AddDays(1);

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _booking = new BookingApi(_factory, _postgres);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _booking.Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private Task<(HttpResponseMessage Response, JsonDocument Body)> GetAsync(Guid serviceId, DateOnly date, string? bearer = null, string extra = "") =>
        _booking.Api.GetAsync($"/api/v1/availability?spaServiceId={serviceId}&date={D(date)}{extra}", bearer);

    private static string[] Starts(JsonDocument body, Guid staffId) => CatalogApi.Data(body).GetProperty("staff").EnumerateArray()
        .Where(staff => staff.GetProperty("id").GetGuid() == staffId)
        .SelectMany(staff => staff.GetProperty("slots").EnumerateArray())
        .Select(slot => slot.GetProperty("startTime").GetString()!)
        .ToArray();

    /// <summary>BKG-T64: a customer asks for slots to move their own appointment (BR-BKG-18).</summary>
    [Fact]
    public async Task Bkg_T64_CustomerAppointmentMode()
    {
        var service = await _booking.Api.SeedServiceAsync(CatalogApi.NewTag() + " đổi lịch");
        var staff = await _booking.SeedQualifiedStaffAsync("NV đổi lịch", service.Id, (Day, 8, 12));
        var (token, customerId) = await _booking.LoginCustomerAsync();
        var mine = await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(9, 30), AppointmentStatus.Confirmed,
            spaServiceId: service.Id, customerId: customerId);
        var others = await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(11), At(12), AppointmentStatus.Confirmed, spaServiceId: service.Id);

        var (ok, okBody) = await _booking.Api.GetAsync($"/api/v1/availability?appointmentId={mine.Id}&date={D(Day)}", token);
        var (foreign, foreignBody) = await _booking.Api.GetAsync($"/api/v1/availability?appointmentId={others.Id}&date={D(Day)}", token);
        var (both, bothBody) = await _booking.Api.GetAsync($"/api/v1/availability?spaServiceId={service.Id}&appointmentId={mine.Id}&date={D(Day)}", token);

        ok.StatusCode.Should().Be(HttpStatusCode.OK, okBody.RootElement.ToString());
        CatalogApi.Data(okBody).GetProperty("durationMinutes").GetInt32().Should().Be(30);
        Starts(okBody, staff.Id).Should().Contain("09:00").And.NotContain("11:00");
        (foreign.StatusCode, CatalogApi.ErrorCode(foreignBody)).Should().Be((HttpStatusCode.NotFound, "appointment_not_found"));
        (both.StatusCode, CatalogApi.ErrorCode(bothBody)).Should().Be((HttpStatusCode.BadRequest, "validation_error"));
    }

    [Fact]
    public async Task HeldUnexpiredBlocksButExpiredAndCancelledDoNot()
    {
        var service = await _booking.Api.SeedServiceAsync(CatalogApi.NewTag() + " giữ chỗ");
        var staff = await _booking.SeedQualifiedStaffAsync("NV giữ chỗ", service.Id, (Day, 8, 12));
        var now = _factory.Clock.UtcNow;
        await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(8), At(9), AppointmentStatus.Held, now.AddMinutes(10));
        await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Held, now.AddMinutes(-1));
        await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(10), At(11), AppointmentStatus.Cancelled);

        var (response, body) = await GetAsync(service.Id, Day);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(body).GetProperty("durationMinutes").GetInt32().Should().Be(60);
        Starts(body, staff.Id).Should().Equal("09:00", "09:30", "10:00", "10:30", "11:00");
        CatalogApi.Data(body).GetProperty("staff")[0].GetProperty("slots")[0].GetProperty("endTime").GetString().Should().Be("10:00");
    }

    [Fact]
    public async Task OnlyEligibleCandidatesAppear()
    {
        var service = await _booking.Api.SeedServiceAsync(CatalogApi.NewTag() + " ứng viên");
        var good = await _booking.SeedQualifiedStaffAsync("A hợp lệ", service.Id, (Day, 8, 12));
        var unskilled = await _booking.Staff.SeedStaffAsync("B không kỹ năng");
        await _booking.Staff.SeedShiftAsync(unskilled.Id, Day, 8, 12);
        var locked = await _booking.Staff.SeedStaffAsync("C bị khóa", status: UserStatus.Locked);
        await _booking.AddSkillAsync(locked.Id, service.Id);
        await _booking.Staff.SeedShiftAsync(locked.Id, Day, 8, 12);
        var notHired = await _booking.Staff.SeedStaffAsync("D chưa vào làm", hireDate: Day.AddDays(1));
        await _booking.AddSkillAsync(notHired.Id, service.Id);
        var cancelledShift = await _booking.Staff.SeedStaffAsync("E ca đã hủy");
        await _booking.AddSkillAsync(cancelledShift.Id, service.Id);
        await _booking.Staff.SeedShiftAsync(cancelledShift.Id, Day, 8, 12, cancelled: true);

        var (_, body) = await GetAsync(service.Id, Day);

        CatalogApi.Data(body).GetProperty("staff").EnumerateArray().Select(staff => staff.GetProperty("id").GetGuid())
            .Should().Equal(good.Id);
    }

    [Fact]
    public async Task CustomerLosesOwnBusySlotsButGuestStillSeesThem()
    {
        var service = await _booking.Api.SeedServiceAsync(CatalogApi.NewTag() + " khách bận");
        var staff = await _booking.SeedQualifiedStaffAsync("NV rảnh", service.Id, (Day, 13, 17));
        var other = await _booking.Staff.SeedStaffAsync("NV khác");
        var (token, customerId) = await _booking.LoginCustomerAsync();
        await _booking.Staff.SeedAppointmentAsync(other.Id, Day, At(14), At(15), AppointmentStatus.Confirmed, customerId: customerId);

        var (_, mine) = await GetAsync(service.Id, Day, token);
        var (_, guest) = await GetAsync(service.Id, Day);

        Starts(mine, staff.Id).Should().Equal("13:00", "15:00", "15:30", "16:00");
        Starts(guest, staff.Id).Should().Contain(["13:30", "14:00", "14:30"]);
    }

    [Fact]
    public async Task OwnerReschedulingSeesTheAppointmentsOwnSlot()
    {
        var owner = await _booking.Api.LoginAsync(UserRole.Owner);
        var service = await _booking.Api.SeedServiceAsync(CatalogApi.NewTag() + " dời lịch");
        var staff = await _booking.SeedQualifiedStaffAsync("NV dời", service.Id, (Day, 8, 12));
        var appointment = await _booking.Staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed, spaServiceId: service.Id);

        var (_, plain) = await GetAsync(service.Id, Day, owner);
        var (_, rescheduling) = await GetAsync(service.Id, Day, owner, $"&appointmentId={appointment.Id}");

        Starts(plain, staff.Id).Should().NotContain("09:00");
        Starts(rescheduling, staff.Id).Should().Contain(["09:00", "09:30"]);
    }

    [Fact]
    public async Task InvalidRequests()
    {
        var discontinued = await _booking.Api.SeedServiceAsync(CatalogApi.NewTag() + " ngừng", status: CatalogStatus.Discontinued);
        var onSale = await _booking.Api.SeedServiceAsync(CatalogApi.NewTag() + " bán");
        var today = _booking.Staff.Today;

        var (hidden, hiddenBody) = await GetAsync(discontinued.Id, Day);
        var (yesterday, _) = await GetAsync(onSale.Id, today.AddDays(-1));
        var (tooFar, _) = await GetAsync(onSale.Id, today.AddDays(61));
        var (lastDay, _) = await GetAsync(onSale.Id, today.AddDays(60));
        var (missing, _) = await _booking.Api.GetAsync($"/api/v1/availability?date={D(Day)}");

        hidden.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(hiddenBody).Should().Be("service_not_found");
        yesterday.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        tooFar.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        lastDay.StatusCode.Should().Be(HttpStatusCode.OK);
        missing.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task NoCandidateGivesEmptyList()
    {
        var service = await _booking.Api.SeedServiceAsync(CatalogApi.NewTag() + " trống");

        var (response, body) = await GetAsync(service.Id, Day);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(body).GetProperty("staff").GetArrayLength().Should().Be(0);
    }
}
