using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Staff;

/// <summary>UC-SPA-23 endpoints (docs/specs/staff.md STF-T14..T16, T18..T24) against PostgreSQL.</summary>
[Collection(PostgresCollection.Name)]
public sealed class WorkScheduleEndpointsTests : IAsyncLifetime
{
    private const string Path = "/api/v1/work-schedules";
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private StaffApi _staff = null!;
    private string _owner = null!;

    public WorkScheduleEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CatalogApi(_factory, _postgres);
        _staff = new StaffApi(_factory, _postgres);
        _owner = await _api.LoginAsync(UserRole.Owner);
    }

    public async Task DisposeAsync()
    {
        _api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private static object Shift(Guid staffId, DateOnly date, string start, string end) =>
        new { staffMemberId = staffId, date = date.ToString("yyyy-MM-dd"), startTime = start, endTime = end };

    private static string D(DateOnly date) => date.ToString("yyyy-MM-dd");

    [Fact]
    public async Task OwnerAddsShiftAndTouchingShift()
    {
        var staff = await _staff.SeedStaffAsync("Ca sáng");
        var day = _staff.Today.AddDays(1);

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, Path, Shift(staff.Id, day, "08:00", "12:00"), _owner);
        var (touching, _) = await _api.SendJsonAsync(HttpMethod.Post, Path, Shift(staff.Id, day, "12:00", "17:00"), _owner);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var data = CatalogApi.Data(body);
        var id = data.GetProperty("id").GetGuid();
        response.Headers.Location!.ToString().Should().EndWith($"{Path}/{id}");
        data.GetProperty("status").GetString().Should().Be("active");
        data.GetProperty("startTime").GetString().Should().Be("08:00");
        data.GetProperty("endTime").GetString().Should().Be("12:00");
        data.GetProperty("staffName").GetString().Should().Be("Ca sáng");
        touching.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task OverlapConflictsButCancelledShiftDoesNot()
    {
        var staff = await _staff.SeedStaffAsync("Chồng ca");
        var day = _staff.Today.AddDays(1);
        await _staff.SeedShiftAsync(staff.Id, day, 8, 12);
        await _staff.SeedShiftAsync(staff.Id, day, 13, 17, cancelled: true);

        var (overlap, body) = await _api.SendJsonAsync(HttpMethod.Post, Path, Shift(staff.Id, day, "11:00", "13:00"), _owner);
        var (overCancelled, _) = await _api.SendJsonAsync(HttpMethod.Post, Path, Shift(staff.Id, day, "14:00", "16:00"), _owner);

        overlap.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(body).Should().Be("shift_conflict");
        overCancelled.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task ConcurrentOverlappingShiftsOnlyOneWins()
    {
        var staff = await _staff.SeedStaffAsync("Đồng thời");
        var day = _staff.Today.AddDays(2);

        var results = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ =>
            _api.SendJsonAsync(HttpMethod.Post, Path, Shift(staff.Id, day, "08:00", "12:00"), _owner)));

        results.Select(result => result.Response.StatusCode).Should().BeEquivalentTo([HttpStatusCode.Created, HttpStatusCode.Conflict]);
        CatalogApi.ErrorCode(results.Single(result => result.Response.StatusCode == HttpStatusCode.Conflict).Body).Should().Be("shift_conflict");
        await using var context = _postgres.CreateContext();
        (await context.WorkSchedules.CountAsync(shift => shift.StaffMemberId == staff.Id)).Should().Be(1);
    }

    [Fact]
    public async Task CreateValidationAndDateRules()
    {
        var staff = await _staff.SeedStaffAsync("Biên", hireDate: _staff.Today.AddDays(3));
        await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/staff/{staff.Id}/resign", new { resignationDate = D(_staff.Today.AddDays(10)) }, _owner);
        var today = _staff.Today;

        async Task<(HttpStatusCode Status, string Code)> Post(DateOnly date, string start, string end)
        {
            var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, Path, Shift(staff.Id, date, start, end), _owner);
            return (response.StatusCode, CatalogApi.ErrorCode(body));
        }

        async Task<string?> FieldError(string start, string end)
        {
            var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, Path, Shift(staff.Id, today.AddDays(4), start, end), _owner);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            return body.RootElement.GetProperty("errors")[0].GetProperty("field").GetString();
        }

        (await FieldError("12:00", "12:00")).Should().Be("EndTime");
        (await FieldError("12:00", "08:00")).Should().Be("EndTime");
        (await FieldError("08:00:30", "12:00")).Should().Be("StartTime");
        (await Post(today.AddDays(-1), "08:00", "12:00")).Should().Be((HttpStatusCode.BadRequest, "shift_date_out_of_range"));
        (await Post(today.AddDays(61), "08:00", "12:00")).Should().Be((HttpStatusCode.BadRequest, "shift_date_out_of_range"));
        (await Post(today.AddDays(2), "08:00", "12:00")).Should().Be((HttpStatusCode.BadRequest, "shift_before_hire_date"));
        (await Post(today.AddDays(10), "08:00", "12:00")).Should().Be((HttpStatusCode.BadRequest, "staff_resigned"));

        var (unknown, unknownBody) = await _api.SendJsonAsync(HttpMethod.Post, Path, Shift(Guid.NewGuid(), today, "08:00", "12:00"), _owner);
        unknown.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(unknownBody).Should().Be("staff_not_found");
    }

    [Fact]
    public async Task TimeAcceptsHourMinuteAndRejectsSeconds()
    {
        var staff = await _staff.SeedStaffAsync("Định dạng giờ");
        var day = _staff.Today.AddDays(1);

        var (shortForm, body) = await _api.SendJsonAsync(HttpMethod.Post, Path, Shift(staff.Id, day, "9:00", "11:30"), _owner);
        var (withZeroSeconds, _) = await _api.SendJsonAsync(HttpMethod.Post, Path, Shift(staff.Id, day, "13:00:00", "14:00:00"), _owner);
        var (withSeconds, _) = await _api.SendJsonAsync(HttpMethod.Post, Path, Shift(staff.Id, day, "15:00:30", "16:00"), _owner);
        var (garbage, _) = await _api.SendJsonAsync(HttpMethod.Post, Path, Shift(staff.Id, day, "nine", "16:00"), _owner);

        shortForm.StatusCode.Should().Be(HttpStatusCode.Created);
        CatalogApi.Data(body).GetProperty("startTime").GetString().Should().Be("09:00");
        withZeroSeconds.StatusCode.Should().Be(HttpStatusCode.Created);
        withSeconds.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        garbage.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateMustKeepAppointmentsInsideTheShift()
    {
        var staff = await _staff.SeedStaffAsync("Sửa ca");
        var day = _staff.Today.AddDays(1);
        var shift = await _staff.SeedShiftAsync(staff.Id, day, 8, 12);
        await _staff.SeedAppointmentAsync(staff.Id, day, new TimeOnly(9, 0), new TimeOnly(10, 0), AppointmentStatus.Confirmed);

        var (narrower, narrowerBody) = await _api.SendJsonAsync(HttpMethod.Put, $"{Path}/{shift.Id}", new { date = D(day), startTime = "09:30", endTime = "12:00" }, _owner);
        var (moved, _) = await _api.SendJsonAsync(HttpMethod.Put, $"{Path}/{shift.Id}", new { date = D(day.AddDays(1)), startTime = "08:00", endTime = "12:00" }, _owner);
        var (ok, okBody) = await _api.SendJsonAsync(HttpMethod.Put, $"{Path}/{shift.Id}", new { date = D(day), startTime = "08:30", endTime = "11:00" }, _owner);

        narrower.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(narrowerBody).Should().Be("shift_has_appointments");
        moved.StatusCode.Should().Be(HttpStatusCode.Conflict);
        ok.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(okBody).GetProperty("startTime").GetString().Should().Be("08:30");
    }

    [Fact]
    public async Task NonOccupyingAppointmentsDoNotBlockUpdate()
    {
        var staff = await _staff.SeedStaffAsync("Lịch không chiếm chỗ");
        var day = _staff.Today.AddDays(1);
        var shift = await _staff.SeedShiftAsync(staff.Id, day, 8, 12);
        await _staff.SeedAppointmentAsync(staff.Id, day, new TimeOnly(9, 0), new TimeOnly(10, 0), AppointmentStatus.Cancelled);
        await _staff.SeedAppointmentAsync(staff.Id, day, new TimeOnly(10, 0), new TimeOnly(11, 0), AppointmentStatus.Held,
            holdExpiresAtUtc: _factory.Clock.UtcNow.AddMinutes(-5));

        var (response, _) = await _api.SendJsonAsync(HttpMethod.Put, $"{Path}/{shift.Id}", new { date = D(day), startTime = "13:00", endTime = "17:00" }, _owner);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CancelRules()
    {
        var staff = await _staff.SeedStaffAsync("Hủy ca");
        var day = _staff.Today.AddDays(1);
        var empty = await _staff.SeedShiftAsync(staff.Id, day, 8, 10);
        var busy = await _staff.SeedShiftAsync(staff.Id, day, 13, 17);
        var past = await _staff.SeedShiftAsync(staff.Id, _staff.Today.AddDays(-1), 8, 12);
        await _staff.SeedAppointmentAsync(staff.Id, day, new TimeOnly(14, 0), new TimeOnly(15, 0), AppointmentStatus.PendingConfirmation);
        var cancel = new { status = "cancelled" };

        var (first, _) = await _api.SendJsonAsync(HttpMethod.Patch, $"{Path}/{empty.Id}/status", cancel, _owner);
        var (again, _) = await _api.SendJsonAsync(HttpMethod.Patch, $"{Path}/{empty.Id}/status", cancel, _owner);
        var (edit, editBody) = await _api.SendJsonAsync(HttpMethod.Put, $"{Path}/{empty.Id}", new { date = D(day), startTime = "08:00", endTime = "09:00" }, _owner);
        var (withBooking, bookingBody) = await _api.SendJsonAsync(HttpMethod.Patch, $"{Path}/{busy.Id}/status", cancel, _owner);
        var (pastCancel, pastBody) = await _api.SendJsonAsync(HttpMethod.Patch, $"{Path}/{past.Id}/status", cancel, _owner);
        var (pastEdit, pastEditBody) = await _api.SendJsonAsync(HttpMethod.Put, $"{Path}/{past.Id}", new { date = D(day), startTime = "08:00", endTime = "09:00" }, _owner);
        var (reopen, reopenBody) = await _api.SendJsonAsync(HttpMethod.Patch, $"{Path}/{busy.Id}/status", new { status = "active" }, _owner);
        var (missing, missingBody) = await _api.SendJsonAsync(HttpMethod.Patch, $"{Path}/{Guid.NewGuid()}/status", cancel, _owner);

        first.StatusCode.Should().Be(HttpStatusCode.NoContent);
        again.StatusCode.Should().Be(HttpStatusCode.NoContent);
        edit.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(editBody).Should().Be("shift_cancelled");
        withBooking.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(bookingBody).Should().Be("shift_has_appointments");
        pastCancel.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(pastBody).Should().Be("shift_in_past");
        pastEdit.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(pastEditBody).Should().Be("shift_in_past");
        reopen.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        reopenBody.RootElement.GetProperty("errors")[0].GetProperty("field").GetString().Should().Be("Status");
        missing.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(missingBody).Should().Be("work_schedule_not_found");
    }

    [Fact]
    public async Task ListValidatesRangeAndFilters()
    {
        var first = await _staff.SeedStaffAsync("Lọc A");
        var second = await _staff.SeedStaffAsync("Lọc B");
        var day = _staff.Today.AddDays(1);
        await _staff.SeedShiftAsync(first.Id, day, 13, 17);
        await _staff.SeedShiftAsync(first.Id, day, 8, 12);
        await _staff.SeedShiftAsync(first.Id, day.AddDays(1), 8, 12, cancelled: true);
        await _staff.SeedShiftAsync(second.Id, day, 8, 12);

        var (missingFrom, _) = await _api.GetAsync($"{Path}?toDate={D(day)}", _owner);
        var (reversed, _) = await _api.GetAsync($"{Path}?fromDate={D(day)}&toDate={D(day.AddDays(-1))}", _owner);
        var (tooLong, _) = await _api.GetAsync($"{Path}?fromDate={D(day)}&toDate={D(day.AddDays(42))}", _owner);
        var (unknown, unknownBody) = await _api.GetAsync($"{Path}?fromDate={D(day)}&toDate={D(day)}&staffMemberId={Guid.NewGuid()}", _owner);
        var (_, mine) = await _api.GetAsync($"{Path}?fromDate={D(day)}&toDate={D(day.AddDays(41))}&staffMemberId={first.Id}", _owner);
        var (_, cancelled) = await _api.GetAsync($"{Path}?fromDate={D(day)}&toDate={D(day.AddDays(1))}&staffMemberId={first.Id}&status=cancelled", _owner);

        missingFrom.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        reversed.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        tooLong.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        unknown.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(unknownBody).Should().Be("staff_not_found");
        CatalogApi.Data(mine).EnumerateArray().Select(item => (item.GetProperty("date").GetString(), item.GetProperty("startTime").GetString()))
            .Should().Equal((D(day), "08:00"), (D(day), "13:00"), (D(day.AddDays(1)), "08:00"));
        CatalogApi.Data(cancelled).EnumerateArray().Select(item => item.GetProperty("status").GetString()).Should().Equal("cancelled");
    }

    [Theory]
    [InlineData(UserRole.Customer)]
    [InlineData(UserRole.Staff)]
    public async Task NonOwnersAreForbidden(UserRole role)
    {
        var bearer = await _api.LoginAsync(role);
        var day = _staff.Today;

        var (list, _) = await _api.GetAsync($"{Path}?fromDate={D(day)}&toDate={D(day)}", bearer);
        var (create, _) = await _api.SendJsonAsync(HttpMethod.Post, Path, Shift(Guid.NewGuid(), day, "08:00", "12:00"), bearer);
        var (cancel, _) = await _api.SendJsonAsync(HttpMethod.Patch, $"{Path}/{Guid.NewGuid()}/status", new { status = "cancelled" }, bearer);
        var (anonymous, _) = await _api.GetAsync($"{Path}?fromDate={D(day)}&toDate={D(day)}");

        new[] { list.StatusCode, create.StatusCode, cancel.StatusCode }.Should().AllBeEquivalentTo(HttpStatusCode.Forbidden);
        anonymous.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ShiftsCannotBeDeleted()
    {
        var staff = await _staff.SeedStaffAsync("Không xóa ca");
        var shift = await _staff.SeedShiftAsync(staff.Id, _staff.Today.AddDays(1), 8, 12);

        var (response, _) = await _api.SendAsync(HttpMethod.Delete, $"{Path}/{shift.Id}", null, _owner);

        response.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
    }
}
