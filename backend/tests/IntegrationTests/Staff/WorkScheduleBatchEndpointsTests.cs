using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Staff;

/// <summary>UC-SPA-23 A4 (docs/specs/staff.md BR-STF-09, STF-T26..T30) against PostgreSQL.</summary>
[Collection(PostgresCollection.Name)]
public sealed class WorkScheduleBatchEndpointsTests : IAsyncLifetime
{
    private const string Path = "/api/v1/work-schedules/batch";
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private StaffApi _staff = null!;
    private string _owner = null!;

    public WorkScheduleBatchEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

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

    private static string D(DateOnly date) => date.ToString("yyyy-MM-dd");

    /// <summary>The Monday after tomorrow, so a two-week range is always inside the 60-day window.</summary>
    private DateOnly NextMonday()
    {
        var day = _staff.Today.AddDays(1);
        while (day.DayOfWeek != DayOfWeek.Monday)
            day = day.AddDays(1);
        return day;
    }

    [Fact]
    public async Task CreatesValidShiftsAndReportsSkippedOnes()
    {
        var monday = NextMonday();
        var an = await _staff.SeedStaffAsync("Batch An");
        var binh = await _staff.SeedStaffAsync("Batch Bình");
        await _staff.SeedShiftAsync(an.Id, monday.AddDays(1), 11, 13);
        await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/staff/{binh.Id}/resign", new { resignationDate = D(monday.AddDays(7)) }, _owner);

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, Path, new
        {
            staffMemberIds = new[] { an.Id, binh.Id },
            fromDate = D(monday),
            toDate = D(monday.AddDays(13)),
            weekdays = new[] { "monday", "tuesday", "wednesday", "thursday", "friday" },
            startTime = "08:00",
            endTime = "12:00",
        }, _owner);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        var created = data.GetProperty("created").EnumerateArray().ToList();
        var skipped = data.GetProperty("skipped").EnumerateArray().ToList();
        // An: 10 weekdays − 1 conflict = 9; Bình: first week only (resigns the second Monday) = 5.
        created.Should().HaveCount(14);
        created.Select(item => DateOnly.Parse(item.GetProperty("date").GetString()!).DayOfWeek)
            .Should().NotContain([DayOfWeek.Saturday, DayOfWeek.Sunday]);
        created[0].GetProperty("startTime").GetString().Should().Be("08:00");
        skipped.Should().HaveCount(6);
        skipped.Count(item => item.GetProperty("reason").GetString() == "shift_conflict").Should().Be(1);
        skipped.Count(item => item.GetProperty("reason").GetString() == "staff_resigned").Should().Be(5);
        skipped.Single(item => item.GetProperty("reason").GetString() == "shift_conflict").GetProperty("date").GetString().Should().Be(D(monday.AddDays(1)));

        await using var context = _postgres.CreateContext();
        (await context.WorkSchedules.CountAsync(shift => shift.StaffMemberId == an.Id && shift.Status == WorkScheduleStatus.Active)).Should().Be(10);
        (await context.WorkSchedules.CountAsync(shift => shift.StaffMemberId == binh.Id)).Should().Be(5);
    }

    [Fact]
    public async Task PastDaysAreSkippedAndEmptyWeekdaysMeansEveryDay()
    {
        var staff = await _staff.SeedStaffAsync("Batch hôm qua");
        var today = _staff.Today;

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, Path, new
        {
            staffMemberIds = new[] { staff.Id }, fromDate = D(today.AddDays(-1)), toDate = D(today.AddDays(2)), startTime = "13:00", endTime = "17:00",
        }, _owner);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("created").GetArrayLength().Should().Be(3);
        var skipped = data.GetProperty("skipped").EnumerateArray().Single();
        skipped.GetProperty("date").GetString().Should().Be(D(today.AddDays(-1)));
        skipped.GetProperty("reason").GetString().Should().Be("shift_date_out_of_range");
        skipped.GetProperty("staffName").GetString().Should().Be("Batch hôm qua");
    }

    [Fact]
    public async Task InvalidRequestsSaveNothing()
    {
        var staff = await _staff.SeedStaffAsync("Batch sai");
        var monday = NextMonday();
        object Body(object ids, DateOnly from, DateOnly to, object? weekdays = null, string start = "08:00", string end = "12:00") =>
            new { staffMemberIds = ids, fromDate = D(from), toDate = D(to), weekdays, startTime = start, endTime = end };

        var requests = new[]
        {
            Body(Array.Empty<Guid>(), monday, monday),
            Body(new[] { staff.Id, staff.Id }, monday, monday),
            Body(new[] { staff.Id }, monday, monday.AddDays(-1)),
            Body(new[] { staff.Id }, monday, monday.AddDays(42)),
            Body(new[] { staff.Id }, monday, monday, Array.Empty<string>()),
            Body(new[] { staff.Id }, monday, monday, new[] { "monday", "monday" }),
            Body(new[] { staff.Id }, monday, monday, new[] { "sunday" }),
            Body(new[] { staff.Id }, monday, monday, start: "12:00", end: "08:00"),
        };
        foreach (var request in requests)
        {
            var (response, _) = await _api.SendJsonAsync(HttpMethod.Post, Path, request, _owner);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        var (unknown, unknownBody) = await _api.SendJsonAsync(HttpMethod.Post, Path, Body(new[] { staff.Id, Guid.NewGuid() }, monday, monday), _owner);
        unknown.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(unknownBody).Should().Be("staff_not_found");

        await using var context = _postgres.CreateContext();
        (await context.WorkSchedules.CountAsync(shift => shift.StaffMemberId == staff.Id)).Should().Be(0);
    }

    [Theory]
    [InlineData(UserRole.Customer)]
    [InlineData(UserRole.Staff)]
    public async Task NonOwnersAreForbidden(UserRole role)
    {
        var bearer = await _api.LoginAsync(role);
        var body = new { staffMemberIds = new[] { Guid.NewGuid() }, fromDate = D(NextMonday()), toDate = D(NextMonday()), startTime = "08:00", endTime = "12:00" };

        var (forbidden, _) = await _api.SendJsonAsync(HttpMethod.Post, Path, body, bearer);
        var (anonymous, _) = await _api.SendJsonAsync(HttpMethod.Post, Path, body, null);

        forbidden.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        anonymous.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
