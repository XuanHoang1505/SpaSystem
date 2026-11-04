using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Repositories;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Staff;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Bookings;

/// <summary>Appointment and candidate reads for bookings (docs/specs/bookings.md: BR-BKG-04, 11, 13, BKG-T06, T10, T23).</summary>
[Collection(PostgresCollection.Name)]
public sealed class AppointmentRepositoryTests : IAsyncLifetime
{
    private static readonly DateOnly Day = new(2026, 11, 2);
    private static readonly DateTime Now = new(2026, 11, 1, 2, 0, 0, DateTimeKind.Utc);
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private StaffApi _staff = null!;

    public AppointmentRepositoryTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _staff = new StaffApi(_factory, _postgres);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private static TimeOnly At(int hour, int minute = 0) => new(hour, minute);

    private async Task<SpaService> SeedServiceAsync(string name)
    {
        await using var context = _postgres.CreateContext();
        var service = new SpaService { Name = name, Category = "Chăm sóc da", DurationMinutes = 60, Price = 300_000 };
        context.SpaServices.Add(service);
        await context.SaveChangesAsync();
        return service;
    }

    [Theory]
    [InlineData(AppointmentSource.Entitlement)]
    [InlineData(AppointmentSource.Session)]
    [InlineData(AppointmentSource.OrderItem)]
    public async Task ServiceIsDerivedFromEachSource(AppointmentSource source)
    {
        var service = await SeedServiceAsync("Dịch vụ nguồn " + source);
        var staff = await _staff.SeedStaffAsync("NV nguồn");
        var appointment = await _staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed, spaServiceId: service.Id, source: source);
        await using var context = _postgres.CreateContext();
        var repository = new AppointmentRepository(context);

        (await repository.GetSpaServiceIdAsync(appointment.Id, default)).Should().Be(service.Id);
        (await repository.GetDetailAsync(appointment.Id, default))!.Service.Should().Be(new AppointmentServiceDto(service.Id, service.Name));
    }

    [Fact]
    public async Task SearchFiltersAndOrders()
    {
        var staff = await _staff.SeedStaffAsync("NV lọc");
        var late = await _staff.SeedAppointmentAsync(staff.Id, Day, At(14), At(15), AppointmentStatus.Confirmed);
        var early = await _staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed);
        var nextDay = await _staff.SeedAppointmentAsync(staff.Id, Day.AddDays(1), At(8), At(9), AppointmentStatus.Confirmed);
        await _staff.SeedAppointmentAsync(staff.Id, Day.AddDays(1), At(10), At(11), AppointmentStatus.Cancelled);
        await _staff.SeedAppointmentAsync(staff.Id, Day.AddDays(5), At(10), At(11), AppointmentStatus.Confirmed);
        await using var context = _postgres.CreateContext();
        var repository = new AppointmentRepository(context);

        var page = await repository.SearchAsync(new AppointmentSearchCriteria(Day, Day.AddDays(1), staff.Id, AppointmentStatus.Confirmed, null, 1, 10), default);

        page.Items.Select(item => item.Id).Should().Equal(early.Id, late.Id, nextDay.Id);
        page.TotalCount.Should().Be(3);
        page.Items[0].Staff.Should().Be(new AppointmentStaffDto(staff.Id, "NV lọc"));
    }

    [Fact]
    public async Task SearchIsAccentInsensitiveAndEscapesWildcards()
    {
        var tag = new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Take(5).ToArray());
        var staff = await _staff.SeedStaffAsync("NV tìm");
        var nguyen = await _staff.SeedCustomerAsync($"Nguyễn Thị {tag}", "0912345678");
        var other = await _staff.SeedCustomerAsync("Trần Văn B", "0987000111");
        var first = await _staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed, customerId: nguyen.Id);
        await _staff.SeedAppointmentAsync(staff.Id, Day, At(11), At(12), AppointmentStatus.Confirmed, customerId: other.Id);
        await using var context = _postgres.CreateContext();
        var repository = new AppointmentRepository(context);

        Task<IReadOnlyList<Guid>> Find(string search) => repository
            .SearchAsync(new AppointmentSearchCriteria(Day, Day, staff.Id, null, search, 1, 10), default)
            .ContinueWith(task => (IReadOnlyList<Guid>)task.Result.Items.Select(item => item.Id).ToList());

        (await Find($"nguyen thi {tag}")).Should().Equal(first.Id);
        (await Find("0912")).Should().Equal(first.Id);
        (await Find("%")).Should().BeEmpty();
        (await Find("_")).Should().BeEmpty();
    }

    [Fact]
    public async Task DetailHasAllergiesSessionAndSkinProfileFlag()
    {
        var staff = await _staff.SeedStaffAsync("NV chi tiết");
        var customer = await _staff.SeedCustomerAsync("Khách dị ứng");
        var appointment = await _staff.SeedAppointmentAsync(
            staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed, customerId: customer.Id, source: AppointmentSource.Session);
        await using (var seed = _postgres.CreateContext())
        {
            seed.CustomerAllergies.Add(new CustomerAllergy { CustomerId = customer.Id, Allergen = "Cồn", Severity = AllergySeverity.Moderate, RecordedAtUtc = Now });
            await seed.SaveChangesAsync();
        }

        await using var context = _postgres.CreateContext();
        var detail = await new AppointmentRepository(context).GetDetailAsync(appointment.Id, default);

        detail!.Allergies.Should().ContainSingle().Which.Allergen.Should().Be("Cồn");
        detail.TreatmentSession!.SequenceNumber.Should().Be(1);
        detail.HasSkinProfile.Should().BeFalse();
        detail.Customer.FullName.Should().Be("Khách dị ứng");
    }

    [Fact]
    public async Task CandidatesExcludeUnqualifiedLockedResignedNotHired()
    {
        var service = await SeedServiceAsync("Dịch vụ ứng viên");
        var qualified = await _staff.SeedStaffAsync("A đủ điều kiện");
        var unskilled = await _staff.SeedStaffAsync("B không kỹ năng");
        var locked = await _staff.SeedStaffAsync("C bị khóa", status: UserStatus.Locked);
        var resigned = await _staff.SeedStaffAsync("D nghỉ việc");
        var notHired = await _staff.SeedStaffAsync("E chưa vào làm", hireDate: Day.AddDays(1));
        await using (var seed = _postgres.CreateContext())
        {
            foreach (var id in new[] { qualified.Id, locked.Id, resigned.Id, notHired.Id })
                seed.StaffSkills.Add(new StaffSkill { StaffMemberId = id, SpaServiceId = service.Id });
            await seed.SaveChangesAsync();
            var member = await seed.StaffMembers.SingleAsync(staff => staff.Id == resigned.Id);
            member.Resign(Day);
            await seed.SaveChangesAsync();
        }

        await using var context = _postgres.CreateContext();
        var repository = new StaffMemberRepository(context);

        (await repository.GetAvailabilityCandidatesAsync(service.Id, Day, null, default))
            .Should().Equal(new AvailabilityCandidate(qualified.Id, "A đủ điều kiện"));
        (await repository.GetAvailabilityCandidatesAsync(service.Id, Day, unskilled.Id, default)).Should().BeEmpty();
        (await repository.HasSkillAsync(qualified.Id, service.Id, default)).Should().BeTrue();
        (await repository.HasSkillAsync(unskilled.Id, service.Id, default)).Should().BeFalse();
    }

    [Fact]
    public async Task ExpireHeldOnlyTouchesExpiredHeldOfThatStaffAndDate()
    {
        var staff = await _staff.SeedStaffAsync("NV giữ chỗ");
        var otherStaff = await _staff.SeedStaffAsync("NV khác");
        var expired = await _staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Held, Now.AddMinutes(-1));
        var live = await _staff.SeedAppointmentAsync(staff.Id, Day, At(11), At(12), AppointmentStatus.Held, Now.AddMinutes(10));
        var otherDay = await _staff.SeedAppointmentAsync(staff.Id, Day.AddDays(1), At(9), At(10), AppointmentStatus.Held, Now.AddMinutes(-1));
        var otherStaffs = await _staff.SeedAppointmentAsync(otherStaff.Id, Day, At(9), At(10), AppointmentStatus.Held, Now.AddMinutes(-1));
        await using var context = _postgres.CreateContext();

        (await new AppointmentRepository(context).ExpireHeldAsync(staff.Id, Day, Now, default)).Should().Be(1);

        var statuses = await context.Appointments.AsNoTracking()
            .Where(appointment => new[] { expired.Id, live.Id, otherDay.Id, otherStaffs.Id }.Contains(appointment.Id))
            .ToDictionaryAsync(appointment => appointment.Id, appointment => appointment.Status);
        statuses[expired.Id].Should().Be(AppointmentStatus.HoldExpired);
        statuses[live.Id].Should().Be(AppointmentStatus.Held);
        statuses[otherDay.Id].Should().Be(AppointmentStatus.Held);
        statuses[otherStaffs.Id].Should().Be(AppointmentStatus.Held);
    }

    [Fact]
    public async Task OccupyingReadsExcludeGivenIdAndFreeStatuses()
    {
        var staff = await _staff.SeedStaffAsync("NV bận");
        var customer = await _staff.SeedCustomerAsync("Khách bận");
        var mine = await _staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed, customerId: customer.Id);
        await _staff.SeedAppointmentAsync(staff.Id, Day, At(13), At(14), AppointmentStatus.PendingConfirmation, customerId: customer.Id);
        await _staff.SeedAppointmentAsync(staff.Id, Day, At(15), At(16), AppointmentStatus.Cancelled, customerId: customer.Id);
        await using var context = _postgres.CreateContext();
        var repository = new AppointmentRepository(context);

        (await repository.GetCustomerOccupyingOnAsync(customer.Id, Day, Now, mine.Id, default)).Should().Equal((At(13), At(14)));
        (await repository.GetOccupyingForStaffOnAsync([staff.Id], Day, Now, null, default))
            .Select(range => range.Start).Should().BeEquivalentTo([At(9), At(13)]);
    }

    [Fact]
    public async Task GetForUpdateLoadsSourcesAndService()
    {
        var service = await SeedServiceAsync("Dịch vụ cập nhật");
        var staff = await _staff.SeedStaffAsync("NV cập nhật");
        var appointment = await _staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed, spaServiceId: service.Id);
        await using var context = _postgres.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var loaded = await new AppointmentRepository(context).GetForUpdateAsync(appointment.Id, default);

        loaded!.Value.SpaServiceId.Should().Be(service.Id);
        loaded.Value.Appointment.ServiceEntitlement!.Status.Should().Be(EntitlementStatus.Booked);
        (await new AppointmentRepository(context).GetForUpdateAsync(Guid.NewGuid(), default)).Should().BeNull();
    }
}
