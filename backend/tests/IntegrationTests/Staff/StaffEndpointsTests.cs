using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Staff;

/// <summary>UC-SPA-22 endpoints (docs/specs/staff.md STF-T01..T13, T24) against PostgreSQL.</summary>
[Collection(PostgresCollection.Name)]
public sealed class StaffEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private StaffApi _staff = null!;
    private string _owner = null!;

    public StaffEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

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

    private object NewStaff(string email, string phone, params Guid[] serviceIds) =>
        new { fullName = "Nguyễn Thị An", email, phoneNumber = phone, hireDate = _staff.Today.ToString("yyyy-MM-dd"), specialty = "Chăm sóc da", spaServiceIds = serviceIds };

    private static string NewEmail() => $"nv-{Guid.NewGuid():N}@spa.test";

    [Fact]
    public async Task OwnerCreatesStaffAndCredentialsAreMailed()
    {
        var first = await _api.SeedServiceAsync(CatalogApi.NewTag() + " da mặt");
        var second = await _api.SeedServiceAsync(CatalogApi.NewTag() + " massage");
        var email = NewEmail();

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff", NewStaff(email, StaffApi.NewPhone(), first.Id, second.Id), _owner);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var data = CatalogApi.Data(body);
        var id = data.GetProperty("id").GetGuid();
        response.Headers.Location!.ToString().Should().EndWith($"/api/v1/staff/{id}");
        data.GetProperty("accountStatus").GetString().Should().Be("active");
        data.GetProperty("services").GetArrayLength().Should().Be(2);
        body.RootElement.GetRawText().Should().NotContainEquivalentOf("password");

        await using (var context = _postgres.CreateContext())
        {
            var user = await context.Users.SingleAsync(user => user.Id == id);
            user.Role.Should().Be(UserRole.Staff);
            user.Status.Should().Be(UserStatus.Active);
            (await context.StaffMembers.CountAsync(staff => staff.Id == id)).Should().Be(1);
            (await context.StaffSkills.CountAsync(skill => skill.StaffMemberId == id)).Should().Be(2);
        }

        _factory.Mail.SentTo(email).Should().ContainSingle().Which.Subject.Should().Be("Tài khoản nhân viên – Spa Như Nguyệt");
        var password = _factory.Mail.LastTemporaryPasswordFor(email);
        var (login, _) = await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/login", new { login = email, password });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task MailFailureCreatesNothing()
    {
        var email = NewEmail();
        _factory.Mail.Fail = true;

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff", NewStaff(email, StaffApi.NewPhone()), _owner);

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        CatalogApi.ErrorCode(body).Should().Be("email_send_failed");
        await using (var context = _postgres.CreateContext())
            (await context.Users.CountAsync(user => user.Email == email)).Should().Be(0);

        _factory.Mail.Fail = false;
        var (retry, _) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff", NewStaff(email, StaffApi.NewPhone()), _owner);
        retry.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task DuplicateEmailOrPhoneConflicts()
    {
        var email = NewEmail();
        var phone = StaffApi.NewPhone();
        await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff", NewStaff(email, phone), _owner);

        var (byEmail, emailBody) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff",
            NewStaff(" " + email.ToUpperInvariant() + " ", StaffApi.NewPhone()), _owner);
        var (byPhone, phoneBody) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff", NewStaff(NewEmail(), phone), _owner);

        byEmail.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(emailBody).Should().Be("email_exists");
        byPhone.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(phoneBody).Should().Be("phone_exists");
    }

    [Fact]
    public async Task InvalidFieldsAreValidationErrors()
    {
        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff",
            new { fullName = "", email = "x@", phoneNumber = "123", hireDate = "1999-12-31", specialty = new string('a', 256), spaServiceIds = Array.Empty<Guid>() },
            _owner);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body.RootElement.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("field").GetString())
            .Should().Contain(["FullName", "Email", "PhoneNumber", "HireDate", "Specialty"]);
    }

    [Fact]
    public async Task UnknownOrDiscontinuedServiceRejected()
    {
        var discontinued = await _api.SeedServiceAsync(CatalogApi.NewTag(), status: CatalogStatus.Discontinued);

        var (unknown, unknownBody) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff", NewStaff(NewEmail(), StaffApi.NewPhone(), Guid.NewGuid()), _owner);
        var (stopped, stoppedBody) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff", NewStaff(NewEmail(), StaffApi.NewPhone(), discontinued.Id), _owner);

        unknown.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(unknownBody).Should().Be("staff_service_not_found");
        stopped.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(stoppedBody).Should().Be("staff_service_discontinued");
    }

    [Fact]
    public async Task UpdateStaffRules()
    {
        var staff = await _staff.SeedStaffAsync("Nhân viên sửa");
        var other = await _staff.SeedStaffAsync("Nhân viên khác");
        await _staff.SeedShiftAsync(staff.Id, _staff.Today.AddDays(3), 8, 12);
        object Body(string phone, DateOnly hire) => new { fullName = "Tên mới", phoneNumber = phone, hireDate = hire.ToString("yyyy-MM-dd"), specialty = "Mới" };

        var (taken, takenBody) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/staff/{staff.Id}", Body(other.User.PhoneNumber, staff.HireDate), _owner);
        var (afterShift, afterShiftBody) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/staff/{staff.Id}",
            Body(staff.User.PhoneNumber, _staff.Today.AddDays(4)), _owner);
        var (missing, missingBody) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/staff/{Guid.NewGuid()}", Body(StaffApi.NewPhone(), staff.HireDate), _owner);
        var (ok, okBody) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/staff/{staff.Id}", Body(staff.User.PhoneNumber, _staff.Today.AddDays(3)), _owner);

        taken.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(takenBody).Should().Be("phone_exists");
        afterShift.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(afterShiftBody).Should().Be("hire_date_after_shift");
        missing.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(missingBody).Should().Be("staff_not_found");
        ok.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(okBody).GetProperty("fullName").GetString().Should().Be("Tên mới");
    }

    [Fact]
    public async Task UpdateHireDateAfterResignationRejected()
    {
        var staff = await _staff.SeedStaffAsync("Nhân viên nghỉ");
        await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/staff/{staff.Id}/resign", new { resignationDate = _staff.Today.AddDays(5).ToString("yyyy-MM-dd") }, _owner);

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/staff/{staff.Id}",
            new { fullName = "An", phoneNumber = staff.User.PhoneNumber, hireDate = _staff.Today.AddDays(6).ToString("yyyy-MM-dd") }, _owner);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(body).Should().Be("resignation_before_hire_date");
    }

    [Fact]
    public async Task UpdateServicesReplacesListAndKeepsDiscontinued()
    {
        var keep = await _api.SeedServiceAsync(CatalogApi.NewTag());
        var drop = await _api.SeedServiceAsync(CatalogApi.NewTag());
        var add = await _api.SeedServiceAsync(CatalogApi.NewTag());
        var (created, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff", NewStaff(NewEmail(), StaffApi.NewPhone(), keep.Id, drop.Id), _owner);
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = CatalogApi.Data(body).GetProperty("id").GetGuid();
        await _api.SendJsonAsync(HttpMethod.Patch, $"/api/v1/services/{keep.Id}/status", new { status = "discontinued" }, _owner);

        var (replaced, _) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/staff/{id}/services", new { spaServiceIds = new[] { keep.Id, add.Id } }, _owner);
        replaced.StatusCode.Should().Be(HttpStatusCode.NoContent);
        await using (var context = _postgres.CreateContext())
            (await context.StaffSkills.Where(skill => skill.StaffMemberId == id).Select(skill => skill.SpaServiceId).ToListAsync())
                .Should().BeEquivalentTo([keep.Id, add.Id]);

        var (emptied, _) = await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/staff/{id}/services", new { spaServiceIds = Array.Empty<Guid>() }, _owner);
        emptied.StatusCode.Should().Be(HttpStatusCode.NoContent);
        await using (var context = _postgres.CreateContext())
            (await context.StaffSkills.CountAsync(skill => skill.StaffMemberId == id)).Should().Be(0);
    }

    [Fact]
    public async Task ResignTodayCancelsShiftsListsAppointmentsAndEndsSessions()
    {
        var email = NewEmail();
        var (created, createdBody) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff", NewStaff(email, StaffApi.NewPhone()), _owner);
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = CatalogApi.Data(createdBody).GetProperty("id").GetGuid();
        var (login, loginBody) = await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/login",
            new { login = email, password = _factory.Mail.LastTemporaryPasswordFor(email) });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        var refreshToken = loginBody.RootElement.GetProperty("data").GetProperty("refreshToken").GetString();
        var today = _staff.Today;
        var yesterday = await _staff.SeedShiftAsync(id, today.AddDays(-1), 8, 12);
        var todayShift = await _staff.SeedShiftAsync(id, today, 8, 12);
        var later = await _staff.SeedShiftAsync(id, today.AddDays(2), 8, 12);
        var confirmed = await _staff.SeedAppointmentAsync(id, today.AddDays(1), new TimeOnly(9, 0), new TimeOnly(10, 0), AppointmentStatus.Confirmed);
        await _staff.SeedAppointmentAsync(id, today.AddDays(1), new TimeOnly(11, 0), new TimeOnly(12, 0), AppointmentStatus.Cancelled);
        await _staff.SeedAppointmentAsync(id, today.AddDays(1), new TimeOnly(13, 0), new TimeOnly(14, 0), AppointmentStatus.Held,
            holdExpiresAtUtc: _factory.Clock.UtcNow.AddMinutes(-1));

        var (response, body) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/staff/{id}/resign", new { resignationDate = today.ToString("yyyy-MM-dd") }, _owner);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("staff").GetProperty("accountStatus").GetString().Should().Be("inactive");
        data.GetProperty("staff").GetProperty("resignationDate").GetString().Should().Be(today.ToString("yyyy-MM-dd"));
        var reassign = data.GetProperty("appointmentsToReassign").EnumerateArray().ToList();
        reassign.Should().ContainSingle().Which.GetProperty("id").GetGuid().Should().Be(confirmed.Id);
        reassign[0].GetProperty("customerName").GetString().Should().StartWith("Khách ");
        await using (var context = _postgres.CreateContext())
        {
            var statuses = await context.WorkSchedules.Where(shift => shift.StaffMemberId == id).ToDictionaryAsync(shift => shift.Id, shift => shift.Status);
            statuses[yesterday.Id].Should().Be(WorkScheduleStatus.Active);
            statuses[todayShift.Id].Should().Be(WorkScheduleStatus.Cancelled);
            statuses[later.Id].Should().Be(WorkScheduleStatus.Cancelled);
        }
        var (refresh, _) = await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/refresh", new { refreshToken });
        refresh.StatusCode.Should().NotBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ResignRulesAndDoubleResign()
    {
        var staff = await _staff.SeedStaffAsync("Nhân viên", hireDate: new DateOnly(2026, 6, 1));

        var (early, earlyBody) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/staff/{staff.Id}/resign", new { resignationDate = "2026-05-31" }, _owner);
        var (first, _) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/staff/{staff.Id}/resign",
            new { resignationDate = _staff.Today.AddDays(30).ToString("yyyy-MM-dd") }, _owner);
        var (second, secondBody) = await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/staff/{staff.Id}/resign",
            new { resignationDate = _staff.Today.AddDays(40).ToString("yyyy-MM-dd") }, _owner);

        early.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        CatalogApi.ErrorCode(earlyBody).Should().Be("resignation_before_hire_date");
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
        CatalogApi.ErrorCode(secondBody).Should().Be("staff_already_resigned");
    }

    [Fact]
    public async Task OwnerListFiltersSearchAndPages()
    {
        var tag = CatalogApi.NewTag();
        var service = await _api.SeedServiceAsync(tag + " dịch vụ");
        var thu = await _staff.SeedStaffAsync($"Lê Thị Thư {tag}");
        var binh = await _staff.SeedStaffAsync($"Trần Bình {tag}");
        await _staff.SeedStaffAsync($"Phạm Cúc {tag}");
        await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/staff/{thu.Id}/services", new { spaServiceIds = new[] { service.Id } }, _owner);
        await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/staff/{binh.Id}/resign", new { resignationDate = _staff.Today.ToString("yyyy-MM-dd") }, _owner);

        var (_, all) = await _api.GetAsync($"/api/v1/staff?search={tag}&pageSize=2&pageNumber=1", _owner);
        var (_, accent) = await _api.GetAsync($"/api/v1/staff?search=le thi thu {tag}", _owner);
        var (_, resigned) = await _api.GetAsync($"/api/v1/staff?search={tag}&status=resigned", _owner);
        var (_, skilled) = await _api.GetAsync($"/api/v1/staff?search={tag}&spaServiceId={service.Id}", _owner);
        var (bad, _) = await _api.GetAsync("/api/v1/staff?status=paused", _owner);

        CatalogApi.Data(all).GetProperty("totalCount").GetInt32().Should().Be(3);
        CatalogApi.Data(all).GetProperty("totalPages").GetInt32().Should().Be(2);
        var first = CatalogApi.Data(all).GetProperty("items")[0];
        first.GetProperty("fullName").GetString().Should().StartWith("Lê Thị Thư");
        first.TryGetProperty("email", out _).Should().BeTrue();
        first.TryGetProperty("phoneNumber", out _).Should().BeTrue();
        Ids(accent).Should().Equal(thu.Id);
        Ids(resigned).Should().Equal(binh.Id);
        Ids(skilled).Should().Equal(thu.Id);
        bad.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(UserRole.Customer)]
    public async Task PublicListShowsWorkingStaffWithoutContacts(UserRole? role)
    {
        var tag = CatalogApi.NewTag();
        var working = await _staff.SeedStaffAsync($"Đang làm {tag}");
        var leaving = await _staff.SeedStaffAsync($"Nghỉ mai {tag}");
        var gone = await _staff.SeedStaffAsync($"Đã nghỉ {tag}");
        await _staff.SeedStaffAsync($"Bị khóa {tag}", status: UserStatus.Locked);
        await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/staff/{leaving.Id}/resign", new { resignationDate = _staff.Today.AddDays(1).ToString("yyyy-MM-dd") }, _owner);
        await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/staff/{gone.Id}/resign", new { resignationDate = _staff.Today.ToString("yyyy-MM-dd") }, _owner);
        var bearer = role is { } r ? await _api.LoginAsync(r) : null;

        var (response, body) = await _api.GetAsync($"/api/v1/staff?search={tag}&status=resigned", bearer);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        Ids(body).Should().BeEquivalentTo([working.Id, leaving.Id]);
        CatalogApi.Data(body).GetProperty("items").EnumerateArray().First().EnumerateObject().Select(property => property.Name)
            .Should().BeEquivalentTo(["id", "fullName", "specialty", "avatarUrl"]);
    }

    [Fact]
    public async Task OwnerSeesDetail()
    {
        var staff = await _staff.SeedStaffAsync("Chi tiết");

        var (response, body) = await _api.GetAsync($"/api/v1/staff/{staff.Id}", _owner);
        var (missing, missingBody) = await _api.GetAsync($"/api/v1/staff/{Guid.NewGuid()}", _owner);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(body).GetProperty("email").GetString().Should().Be(staff.User.Email);
        missing.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(missingBody).Should().Be("staff_not_found");
    }

    [Theory]
    [InlineData(UserRole.Customer)]
    [InlineData(UserRole.Staff)]
    public async Task NonOwnersAreForbidden(UserRole role)
    {
        var bearer = await _api.LoginAsync(role);
        var id = Guid.NewGuid();

        var responses = new[]
        {
            await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff", NewStaff(NewEmail(), StaffApi.NewPhone()), bearer),
            await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/staff/{id}", new { fullName = "A" }, bearer),
            await _api.SendJsonAsync(HttpMethod.Put, $"/api/v1/staff/{id}/services", new { spaServiceIds = Array.Empty<Guid>() }, bearer),
            await _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/staff/{id}/resign", new { resignationDate = "2026-12-01" }, bearer),
            await _api.GetAsync($"/api/v1/staff/{id}", bearer),
        };

        responses.Select(result => result.Response.StatusCode).Should().AllBeEquivalentTo(HttpStatusCode.Forbidden);
        CatalogApi.ErrorCode(responses[0].Body).Should().Be("forbidden");
    }

    [Fact]
    public async Task AnonymousWritesAreUnauthorized()
    {
        var (create, body) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/staff", NewStaff(NewEmail(), StaffApi.NewPhone()), null);
        var (detail, _) = await _api.GetAsync($"/api/v1/staff/{Guid.NewGuid()}");

        create.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        CatalogApi.ErrorCode(body).Should().Be("unauthorized");
        detail.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task StaffCannotBeDeleted()
    {
        var staff = await _staff.SeedStaffAsync("Không xóa");

        var (response, _) = await _api.SendAsync(HttpMethod.Delete, $"/api/v1/staff/{staff.Id}", null, _owner);

        response.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
    }

    private static Guid[] Ids(JsonDocument body) =>
        CatalogApi.Data(body).GetProperty("items").EnumerateArray().Select(item => item.GetProperty("id").GetGuid()).ToArray();
}
