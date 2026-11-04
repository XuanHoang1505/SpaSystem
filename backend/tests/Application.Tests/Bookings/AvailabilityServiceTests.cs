using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Application.Validators.Bookings;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Bookings;

/// <summary>GET /availability (docs/specs/bookings.md BR-BKG-12, BKG-T07, T08). Clock: 00:30 on 27/10/2026 in Vietnam; step 30'.</summary>
public sealed class AvailabilityServiceTests
{
    private static readonly DateOnly Today = StaffTestDoubles.VietnamToday;
    private static readonly DateOnly Day = Today.AddDays(1);
    private readonly ISpaServiceRepository _services = Substitute.For<ISpaServiceRepository>();
    private readonly IStaffMemberRepository _staff = Substitute.For<IStaffMemberRepository>();
    private readonly IWorkScheduleRepository _shifts = Substitute.For<IWorkScheduleRepository>();
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IPurchaseRepository _purchases = Substitute.For<IPurchaseRepository>();
    private readonly SpaService _service = new() { Name = "Chăm sóc da", DurationMinutes = 60 };
    private readonly Guid _staffId = Guid.NewGuid();

    public AvailabilityServiceTests()
    {
        _services.GetByIdAsync(_service.Id, Arg.Any<CancellationToken>()).Returns(_service);
        _staff.GetAvailabilityCandidatesAsync(_service.Id, Arg.Any<DateOnly>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns([new AvailabilityCandidate(_staffId, "An")]);
        _shifts.GetActiveRangesAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<DateOnly>(), Arg.Any<DateOnly>(), Arg.Any<CancellationToken>())
            .Returns(call => [(_staffId, call.ArgAt<DateOnly>(1), new TimeOnly(8, 0), new TimeOnly(12, 0))]);
        _appointments.GetOccupyingForStaffOnAsync(default!, default, default, default, default).ReturnsForAnyArgs([]);
        _appointments.GetCustomerOccupyingOnAsync(default, default, default, default, default).ReturnsForAnyArgs([]);
    }

    private AvailabilityService Create(ICurrentUserService user)
    {
        var options = Options.Create(new BookingOptions());
        var clock = StaffTestDoubles.Clock();
        return new AvailabilityService(_services, _staff, _shifts, _appointments, _purchases, user, clock, options,
            new AvailabilityQueryValidator(clock, options));
    }

    private static string[] Starts(AvailabilityDto result) =>
        result.Staff.SelectMany(staff => staff.Slots).Select(slot => slot.StartTime.ToString("HH:mm")).ToArray();

    private static AppointmentDetailDto Detail(Guid id, Guid customerId, TimeOnly start, TimeOnly end) => new(
        id, Day, start, end, AppointmentStatus.Confirmed, new AppointmentCustomerDto(customerId, "Khách", "0900000000"),
        new AppointmentStaffDto(Guid.NewGuid(), "An"), new AppointmentServiceDto(Guid.NewGuid(), "Chăm sóc da"),
        null, null, null, null, DateTime.UtcNow, [], null, false, null);

    [Fact]
    public async Task ReturnsSlotsOfQualifiedStaff()
    {
        var result = await Create(StaffTestDoubles.User(null)).GetAsync(new AvailabilityQuery(_service.Id, Day, null, null), default);

        result.Data!.DurationMinutes.Should().Be(60);
        result.Data.Staff.Should().ContainSingle().Which.FullName.Should().Be("An");
        Starts(result.Data).Should().Equal("08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00");
    }

    [Fact]
    public async Task GuestCallerIgnoresAppointmentId()
    {
        await Create(StaffTestDoubles.User(null)).GetAsync(new AvailabilityQuery(_service.Id, Day, null, Guid.NewGuid()), default);

        await _appointments.DidNotReceiveWithAnyArgs().GetDetailAsync(default, default);
        await _appointments.DidNotReceiveWithAnyArgs().GetMineAsync(default, default, default);
    }

    private Guid SeedMine(ICurrentUserService user, TimeOnly start, TimeOnly end, Guid? sessionId = null)
    {
        var id = Guid.NewGuid();
        var dto = new MyAppointmentDto(id, Day, start, end, AppointmentStatus.Confirmed, null, null, null, DateTime.UtcNow,
            new AppointmentServiceDto(_service.Id, _service.Name), new AppointmentStaffDto(_staffId, "An"),
            sessionId is null ? AppointmentBookingSource.Entitlement : AppointmentBookingSource.Session, null,
            sessionId is { } session ? new MyTreatmentSessionRefDto(session, 2, Guid.NewGuid(), "Gói") : null, null);
        _appointments.GetMineAsync(id, user.UserId!.Value, Arg.Any<CancellationToken>())
            .Returns(new MyAppointmentRow(dto, new AppointmentChangeFacts(AppointmentStatus.Confirmed, Day, start, null, null, null, null)));
        return id;
    }

    private SessionBookingFacts SessionFacts(Guid sessionId, PreviousVisit? previous, NextVisit? next) => new(
        sessionId, _service.Id, 60, 2, TreatmentSessionStatus.Booked, CustomerPackageStatus.Active, DateTime.UtcNow.AddDays(60),
        TreatmentPlanStatus.InProgress, true, previous, 7, next);

    [Fact]
    public async Task CustomerAppointmentDoesNotBlockItself()
    {
        var customer = StaffTestDoubles.User(Roles.Customer);
        _service.DurationMinutes = 90;
        var id = SeedMine(customer, new TimeOnly(9, 0), new TimeOnly(10, 0));

        var result = await Create(customer).GetAsync(new AvailabilityQuery { AppointmentId = id, Date = Day }, default);

        result.Data!.DurationMinutes.Should().Be(60);
        await _appointments.Received().GetOccupyingForStaffOnAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Day, Arg.Any<DateTime>(), id, Arg.Any<CancellationToken>());
        await _appointments.Received().GetCustomerOccupyingOnAsync(customer.UserId!.Value, Day, Arg.Any<DateTime>(), id, Arg.Any<CancellationToken>());
        Starts(result.Data).Should().Contain("09:00");
    }

    [Fact]
    public async Task CustomerAppointmentWithServiceIdIsInvalid()
    {
        var customer = StaffTestDoubles.User(Roles.Customer);
        var id = SeedMine(customer, new TimeOnly(9, 0), new TimeOnly(10, 0));

        var act = () => Create(customer).GetAsync(new AvailabilityQuery(_service.Id, Day, null, id), default);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("validation_error");
    }

    [Fact]
    public async Task OthersAppointmentIsNotFound()
    {
        var act = () => Create(StaffTestDoubles.User(Roles.Customer)).GetAsync(new AvailabilityQuery { AppointmentId = Guid.NewGuid(), Date = Day }, default);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("appointment_not_found");
    }

    [Fact]
    public async Task GuestWithAppointmentOnlyIsNotFound()
    {
        var act = () => Create(StaffTestDoubles.User(null)).GetAsync(new AvailabilityQuery { AppointmentId = Guid.NewGuid(), Date = Day }, default);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("appointment_not_found");
    }

    [Fact]
    public async Task SessionAppointmentOutsideWindowIsEmpty()
    {
        var customer = StaffTestDoubles.User(Roles.Customer);
        var sessionId = Guid.NewGuid();
        var id = SeedMine(customer, new TimeOnly(9, 0), new TimeOnly(10, 0), sessionId);
        _purchases.GetSessionFactsAsync(sessionId, customer.UserId!.Value, Arg.Any<CancellationToken>())
            .Returns(SessionFacts(sessionId, new PreviousVisit(Day.AddDays(-1), new TimeOnly(10, 0)), null));

        var result = await Create(customer).GetAsync(new AvailabilityQuery { AppointmentId = id, Date = Day }, default);

        result.Data!.Staff.Should().BeEmpty();
    }

    [Fact]
    public async Task SessionAppointmentOnNextVisitDayEndsBeforeIt()
    {
        var customer = StaffTestDoubles.User(Roles.Customer);
        var sessionId = Guid.NewGuid();
        var id = SeedMine(customer, new TimeOnly(8, 0), new TimeOnly(9, 0), sessionId);
        _purchases.GetSessionFactsAsync(sessionId, customer.UserId!.Value, Arg.Any<CancellationToken>())
            .Returns(SessionFacts(sessionId, null, new NextVisit(Day, new TimeOnly(10, 0), 0)));

        var result = await Create(customer).GetAsync(new AvailabilityQuery { AppointmentId = id, Date = Day }, default);

        Starts(result.Data!).Should().Equal("08:00", "08:30", "09:00");
    }

    [Fact]
    public async Task OwnerAppointmentOnlyDerivesService()
    {
        var appointmentId = Guid.NewGuid();
        _appointments.GetDetailAsync(appointmentId, Arg.Any<CancellationToken>())
            .Returns(Detail(appointmentId, Guid.NewGuid(), new TimeOnly(9, 0), new TimeOnly(10, 0)));
        _appointments.GetSpaServiceIdAsync(appointmentId, Arg.Any<CancellationToken>()).Returns(_service.Id);

        var result = await Create(StaffTestDoubles.User(Roles.Owner)).GetAsync(new AvailabilityQuery { AppointmentId = appointmentId, Date = Day }, default);

        result.Data!.DurationMinutes.Should().Be(60);
        result.Data.Staff.Should().ContainSingle();
    }

    [Fact]
    public void ValidatorAcceptsAppointmentInsteadOfSource()
    {
        var validator = new AvailabilityQueryValidator(StaffTestDoubles.Clock(), Options.Create(new BookingOptions()));

        validator.Validate(new AvailabilityQuery { AppointmentId = Guid.NewGuid(), Date = Day }).IsValid.Should().BeTrue();
        validator.Validate(new AvailabilityQuery(_service.Id, Day, null, Guid.NewGuid())).IsValid.Should().BeTrue();
        validator.Validate(new AvailabilityQuery { Date = Day }).IsValid.Should().BeFalse();
        validator.Validate(new AvailabilityQuery { SpaServiceId = _service.Id, TreatmentSessionId = Guid.NewGuid(), Date = Day }).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task OwnerAppointmentIdUsesItsDurationAndExcludesItself()
    {
        var appointmentId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        _appointments.GetDetailAsync(appointmentId, Arg.Any<CancellationToken>())
            .Returns(Detail(appointmentId, customerId, new TimeOnly(9, 0), new TimeOnly(10, 30)));

        var result = await Create(StaffTestDoubles.User(Roles.Owner)).GetAsync(new AvailabilityQuery(_service.Id, Day, null, appointmentId), default);

        result.Data!.DurationMinutes.Should().Be(90);
        await _appointments.Received().GetOccupyingForStaffOnAsync(
            Arg.Any<IReadOnlyCollection<Guid>>(), Day, Arg.Any<DateTime>(), appointmentId, Arg.Any<CancellationToken>());
        await _appointments.Received().GetCustomerOccupyingOnAsync(customerId, Day, Arg.Any<DateTime>(), appointmentId, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task OwnerUnknownAppointmentIdIsNotFound()
    {
        var act = () => Create(StaffTestDoubles.User(Roles.Owner)).GetAsync(new AvailabilityQuery(_service.Id, Day, null, Guid.NewGuid()), default);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("appointment_not_found");
    }

    [Fact]
    public async Task CustomerOwnAppointmentsBlockSlots()
    {
        var user = StaffTestDoubles.User(Roles.Customer);
        _appointments.GetCustomerOccupyingOnAsync(user.UserId!.Value, Day, Arg.Any<DateTime>(), null, Arg.Any<CancellationToken>())
            .Returns([(new TimeOnly(9, 0), new TimeOnly(10, 0))]);

        var result = await Create(user).GetAsync(new AvailabilityQuery(_service.Id, Day, null, null), default);

        Starts(result.Data!).Should().Equal("08:00", "10:00", "10:30", "11:00");
    }

    [Fact]
    public async Task StaffBusyRangesBlockOnlyThatStaff()
    {
        _appointments.GetOccupyingForStaffOnAsync(default!, default, default, default, default)
            .ReturnsForAnyArgs([(_staffId, new TimeOnly(8, 0), new TimeOnly(11, 0))]);

        var result = await Create(StaffTestDoubles.User(null)).GetAsync(new AvailabilityQuery(_service.Id, Day, null, null), default);

        Starts(result.Data!).Should().Equal("11:00");
    }

    [Fact]
    public async Task StaffWithoutSlotsAreOmitted()
    {
        _shifts.GetActiveRangesAsync(default!, default, default, default).ReturnsForAnyArgs([]);

        var result = await Create(StaffTestDoubles.User(null)).GetAsync(new AvailabilityQuery(_service.Id, Day, null, null), default);

        result.Data!.Staff.Should().BeEmpty();
    }

    [Fact]
    public async Task TodayDropsPastSlots()
    {
        var result = await Create(StaffTestDoubles.User(null)).GetAsync(new AvailabilityQuery(_service.Id, Today, null, null), default);

        Starts(result.Data!).Should().StartWith("08:00");
        result.Data!.Date.Should().Be(Today);
    }

    [Fact]
    public async Task DiscontinuedServiceIsHiddenFromPublicButNotOwner()
    {
        _service.ChangeStatus(CatalogStatus.Discontinued);
        var query = new AvailabilityQuery(_service.Id, Day, null, null);

        var act = () => Create(StaffTestDoubles.User(Roles.Customer)).GetAsync(query, default);
        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("service_not_found");
        (await Create(StaffTestDoubles.User(Roles.Owner)).GetAsync(query, default)).Data!.Staff.Should().NotBeEmpty();
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(61)]
    public async Task DateOutsideRangeIsValidationError(int offset)
    {
        var act = () => Create(StaffTestDoubles.User(null)).GetAsync(new AvailabilityQuery(_service.Id, Today.AddDays(offset), null, null), default);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task MissingServiceOrDateIsValidationError()
    {
        await FluentActions.Invoking(() => Create(StaffTestDoubles.User(null)).GetAsync(new AvailabilityQuery(null, Day, null, null), default))
            .Should().ThrowAsync<ValidationException>();
        await FluentActions.Invoking(() => Create(StaffTestDoubles.User(null)).GetAsync(new AvailabilityQuery(_service.Id, null, null, null), default))
            .Should().ThrowAsync<ValidationException>();
    }

    private Guid OwnedEntitlement(ICurrentUserService customer)
    {
        var id = Guid.NewGuid();
        _purchases.GetServiceAsync(id, customer.UserId!.Value, Arg.Any<CancellationToken>()).Returns(new PurchasedServiceRow(
            id, _service.Id, _service.Name, null, 60, EntitlementStatus.Available, null, DateTime.UtcNow, null, new PurchaseOrderRefDto(Guid.NewGuid(), "DH1")));
        return id;
    }

    private Guid OwnedSession(ICurrentUserService customer, PreviousVisit? previous = null, int minDays = 7, DateTime? expiresAtUtc = null)
    {
        var id = Guid.NewGuid();
        _purchases.GetSessionFactsAsync(id, customer.UserId!.Value, Arg.Any<CancellationToken>()).Returns(new SessionBookingFacts(
            id, _service.Id, 45, 2, TreatmentSessionStatus.NotBooked, CustomerPackageStatus.Active, expiresAtUtc ?? DateTime.UtcNow.AddDays(90),
            TreatmentPlanStatus.InProgress, true, previous, minDays));
        return id;
    }

    [Fact]
    public async Task EntitlementSourceAllowsDiscontinuedService()
    {
        _service.ChangeStatus(CatalogStatus.Discontinued);
        var customer = StaffTestDoubles.User(Roles.Customer);

        var result = await Create(customer).GetAsync(new AvailabilityQuery { ServiceEntitlementId = OwnedEntitlement(customer), Date = Day }, default);

        result.Data!.Staff.Should().ContainSingle();
        result.Data.DurationMinutes.Should().Be(60);
    }

    [Fact]
    public async Task SessionSourceUsesSnapshotDuration()
    {
        var customer = StaffTestDoubles.User(Roles.Customer);

        var result = await Create(customer).GetAsync(new AvailabilityQuery { TreatmentSessionId = OwnedSession(customer), Date = Day }, default);

        result.Data!.DurationMinutes.Should().Be(45);
        Starts(result.Data).Should().Contain(["08:00", "11:00"]);
    }

    [Fact]
    public async Task SessionBeforeEarliestDateIsEmpty()
    {
        var customer = StaffTestDoubles.User(Roles.Customer);
        var session = OwnedSession(customer, new PreviousVisit(Today, new TimeOnly(9, 0)), minDays: 7);

        var early = await Create(customer).GetAsync(new AvailabilityQuery { TreatmentSessionId = session, Date = Day }, default);
        var onTime = await Create(customer).GetAsync(new AvailabilityQuery { TreatmentSessionId = session, Date = Today.AddDays(7) }, default);

        early.Data!.Staff.Should().BeEmpty();
        onTime.Data!.Staff.Should().ContainSingle();
    }

    [Fact]
    public async Task SessionOnExpiryDayKeepsSlotsStartingBeforeExpiry()
    {
        var customer = StaffTestDoubles.User(Roles.Customer);
        // Expires 10:00 VN on Day (03:00 UTC); Q-30 accepts any start before that.
        var session = OwnedSession(customer, expiresAtUtc: new DateTime(2026, 10, 28, 3, 0, 0, DateTimeKind.Utc));

        var result = await Create(customer).GetAsync(new AvailabilityQuery { TreatmentSessionId = session, Date = Day }, default);

        Starts(result.Data!).Should().Equal("08:00", "08:30", "09:00", "09:30");
    }

    [Fact]
    public async Task SessionAfterExpiryDayIsEmpty()
    {
        var customer = StaffTestDoubles.User(Roles.Customer);
        var session = OwnedSession(customer, expiresAtUtc: new DateTime(2026, 10, 27, 3, 0, 0, DateTimeKind.Utc));

        var result = await Create(customer).GetAsync(new AvailabilityQuery { TreatmentSessionId = session, Date = Day }, default);

        result.Data!.Staff.Should().BeEmpty();
    }

    [Fact]
    public async Task SessionSameDayDropsSlotsBeforePreviousEnd()
    {
        var customer = StaffTestDoubles.User(Roles.Customer);
        var session = OwnedSession(customer, new PreviousVisit(Day, new TimeOnly(10, 0)), minDays: 0);

        var result = await Create(customer).GetAsync(new AvailabilityQuery { TreatmentSessionId = session, Date = Day }, default);

        Starts(result.Data!).Should().Equal("10:00", "10:30", "11:00");
    }

    [Fact]
    public async Task GuestWithEntitlementIsNotFound()
    {
        var act = () => Create(StaffTestDoubles.User(null)).GetAsync(new AvailabilityQuery { ServiceEntitlementId = Guid.NewGuid(), Date = Day }, default);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(BookingErrors.EntitlementNotFoundCode);
    }

    [Fact]
    public async Task OthersSessionIsNotFound()
    {
        var act = () => Create(StaffTestDoubles.User(Roles.Customer)).GetAsync(
            new AvailabilityQuery { TreatmentSessionId = Guid.NewGuid(), Date = Day }, default);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(BookingErrors.TreatmentSessionNotFoundCode);
    }

    [Fact]
    public async Task TwoSourcesIsValidationError()
    {
        var act = () => Create(StaffTestDoubles.User(Roles.Customer)).GetAsync(
            new AvailabilityQuery { SpaServiceId = _service.Id, TreatmentSessionId = Guid.NewGuid(), Date = Day }, default);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task NoSourceIsValidationError()
    {
        var act = () => Create(StaffTestDoubles.User(null)).GetAsync(new AvailabilityQuery { Date = Day }, default);

        await act.Should().ThrowAsync<ValidationException>();
    }
}
