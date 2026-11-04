using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Application.Validators;
using NhuNguyetSpa.Application.Validators.Bookings;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Bookings;

/// <summary>
/// UC-SPA-17 (docs/specs/bookings.md BR-BKG-01..04, 08..11, BKG-T11..T21). The clock is 17:30 UTC on 28/10/2026, which is
/// already 00:30 on 29/10 in Vietnam; the appointment is 30/10 09:00–10:00 with a shift 08:00–12:00 on every day.
/// </summary>
public sealed class AppointmentManagementServiceTests
{
    private static readonly DateTime Now = new(2026, 10, 28, 17, 30, 0, DateTimeKind.Utc);
    private static readonly DateOnly Today = new(2026, 10, 29);
    private static readonly DateOnly Day = new(2026, 10, 30);
    private static readonly DateOnly NextDay = new(2026, 10, 31);
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IStaffMemberRepository _staff = Substitute.For<IStaffMemberRepository>();
    private readonly IWorkScheduleRepository _shifts = Substitute.For<IWorkScheduleRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly StaffMember _member = Member("An");
    private readonly Guid _serviceId = Guid.NewGuid();
    private readonly Appointment _appointment;
    private BookingOptions _options = new();

    public AppointmentManagementServiceTests()
    {
        _appointment = new Appointment
        {
            CustomerId = Guid.NewGuid(),
            StaffMemberId = _member.Id,
            Date = Day,
            StartTime = At(9),
            EndTime = At(10),
            Status = AppointmentStatus.Confirmed,
            ServiceEntitlement = new ServiceEntitlement { Status = EntitlementStatus.Booked },
            TreatmentSession = new TreatmentSession { Status = TreatmentSessionStatus.Booked },
        };
        _appointments.GetForUpdateAsync(_appointment.Id, Arg.Any<CancellationToken>()).Returns((_appointment, _serviceId));
        _appointments.GetDetailAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(call => Detail(call.Arg<Guid>(), _member.Id));
        _appointments.GetOccupyingForStaffOnAsync(default!, default, default, default, default).ReturnsForAnyArgs([]);
        _appointments.GetCustomerOccupyingOnAsync(default, default, default, default, default).ReturnsForAnyArgs([]);
        Register(_member);
        _shifts.GetActiveRangesAsync(default!, default, default, default).ReturnsForAnyArgs(call =>
            call.ArgAt<IReadOnlyCollection<Guid>>(0).Select(id => (id, call.ArgAt<DateOnly>(1), At(8), At(12))).ToList());
        _unitOfWork.ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Func<CancellationToken, Task>>()(CancellationToken.None));
    }

    private static TimeOnly At(int hour, int minute = 0) => new(hour, minute);

    private static StaffMember Member(string name)
    {
        var user = new User { FullName = name, Role = UserRole.Staff, Status = UserStatus.Active };
        return new StaffMember { Id = user.Id, User = user, HireDate = new DateOnly(2026, 1, 1) };
    }

    private void Register(StaffMember member)
    {
        _staff.GetByIdAsync(member.Id, Arg.Any<CancellationToken>()).Returns(member);
        _staff.GetWithUsersAsync(Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Contains(member.Id)), Arg.Any<CancellationToken>()).Returns([member]);
        _staff.HasSkillAsync(member.Id, _serviceId, Arg.Any<CancellationToken>()).Returns(true);
    }

    private static AppointmentDetailDto Detail(Guid id, Guid staffId) => new(
        id, Day, At(9), At(10), AppointmentStatus.Confirmed, new AppointmentCustomerDto(Guid.NewGuid(), "Khách", "0900000000"),
        new AppointmentStaffDto(staffId, "An"), new AppointmentServiceDto(Guid.NewGuid(), "Chăm sóc da"),
        null, null, null, null, Now, [], null, false, null);

    private AppointmentManagementService Create(ICurrentUserService? user = null)
    {
        var clock = Substitute.For<IDateTimeProvider>();
        clock.UtcNow.Returns(Now);
        var options = Options.Create(_options);
        return new AppointmentManagementService(
            _appointments, _staff, _shifts, _unitOfWork, user ?? StaffTestDoubles.User(Roles.Owner), clock, options,
            new PagedQueryValidator(), new AppointmentListQueryValidator(options), new RescheduleAppointmentRequestValidator(),
            new AssignAppointmentStaffRequestValidator(), new CancelAppointmentRequestValidator(), new MarkNoShowRequestValidator());
    }

    private Task Reschedule(DateOnly date, TimeOnly start) =>
        Create().RescheduleAsync(_appointment.Id, new RescheduleAppointmentRequest(date, start), CancellationToken.None);

    private async Task<string?> RescheduleFails(DateOnly date, TimeOnly start) =>
        (await FluentActions.Invoking(() => Reschedule(date, start)).Should().ThrowAsync<DomainException>()).Which.Code;

    private Task Assign(Guid staffId) =>
        Create().AssignStaffAsync(_appointment.Id, new AssignAppointmentStaffRequest(staffId), CancellationToken.None);

    private async Task<string?> AssignFails(Guid staffId) =>
        (await FluentActions.Invoking(() => Assign(staffId)).Should().ThrowAsync<DomainException>()).Which.Code;

    [Fact]
    public async Task RescheduleMovesWithinShiftKeepingDuration()
    {
        await Reschedule(NextDay, At(10, 30));

        _appointment.Date.Should().Be(NextDay);
        _appointment.StartTime.Should().Be(At(10, 30));
        _appointment.EndTime.Should().Be(At(11, 30));
        _appointment.Status.Should().Be(AppointmentStatus.Confirmed);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RescheduleAcceptsOffGridTime()
    {
        await Reschedule(Day, At(9, 10));

        _appointment.StartTime.Should().Be(At(9, 10));
    }

    [Fact]
    public async Task RescheduleOfStartedAppointmentIsInPast()
    {
        _appointment.Date = Today;
        _appointment.StartTime = At(0, 15);
        _appointment.EndTime = At(1, 15);

        (await RescheduleFails(NextDay, At(9))).Should().Be("appointment_in_past");
    }

    [Fact]
    public async Task RescheduleToPastTimeIsInPast()
    {
        (await RescheduleFails(Today, At(0, 15))).Should().Be("appointment_in_past");
    }

    [Fact]
    public async Task RescheduleWrappingPastMidnightIsOutsideSchedule()
    {
        (await RescheduleFails(NextDay, At(23, 30))).Should().Be("outside_work_schedule");
    }

    [Fact]
    public async Task RescheduleOutsideShiftOrAcrossTwoShiftsIsOutsideSchedule()
    {
        (await RescheduleFails(Day, At(11, 30))).Should().Be("outside_work_schedule");

        _shifts.GetActiveRangesAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<DateOnly>(), Arg.Any<DateOnly>(), Arg.Any<CancellationToken>()).Returns(
            [(_member.Id, Day, At(8), At(10)), (_member.Id, Day, At(10), At(12))]);
        (await RescheduleFails(Day, At(9, 30))).Should().Be("outside_work_schedule");
    }

    [Fact]
    public async Task RescheduleToDayStaffHasLeftIsOutsideSchedule()
    {
        _member.Resign(NextDay);

        (await RescheduleFails(NextDay, At(9))).Should().Be("outside_work_schedule");
    }

    [Fact]
    public async Task RescheduleOntoStaffAppointmentIsSlotUnavailable()
    {
        _appointments.GetOccupyingForStaffOnAsync(default!, default, default, default, default)
            .ReturnsForAnyArgs([(_member.Id, At(10), At(11))]);

        (await RescheduleFails(Day, At(10, 30))).Should().Be("slot_unavailable");
    }

    [Fact]
    public async Task RescheduleOntoCustomerAppointmentIsCustomerBusy()
    {
        _appointments.GetCustomerOccupyingOnAsync(default, default, default, default, default).ReturnsForAnyArgs([(At(10), At(11))]);

        (await RescheduleFails(Day, At(10, 30))).Should().Be("customer_busy");
    }

    [Fact]
    public async Task RescheduleOverlappingOwnOldSlotSucceeds()
    {
        await Reschedule(Day, At(9, 30));

        await _appointments.Received().GetOccupyingForStaffOnAsync(
            Arg.Any<IReadOnlyCollection<Guid>>(), Day, Now, _appointment.Id, Arg.Any<CancellationToken>());
        await _appointments.Received().GetCustomerOccupyingOnAsync(_appointment.CustomerId, Day, Now, _appointment.Id, Arg.Any<CancellationToken>());
        _appointment.StartTime.Should().Be(At(9, 30));
    }

    [Fact]
    public async Task RescheduleLocksStaffAndExpiresStaleHeldBeforeChecking()
    {
        await Reschedule(NextDay, At(9));

        Received.InOrder(() =>
        {
            _staff.LockForBookingAsync(_member.Id, Arg.Any<CancellationToken>());
            _appointments.LockCustomerForBookingAsync(_appointment.CustomerId, Arg.Any<CancellationToken>());
            _appointments.ExpireHeldAsync(_member.Id, NextDay, Now, Arg.Any<CancellationToken>());
            _appointments.GetOccupyingForStaffOnAsync(Arg.Any<IReadOnlyCollection<Guid>>(), NextDay, Now, _appointment.Id, Arg.Any<CancellationToken>());
        });
    }

    [Fact]
    public async Task AssignStaffMovesToQualifiedFreeStaff()
    {
        var other = Member("Bình");
        Register(other);

        await Assign(other.Id);

        _appointment.StaffMemberId.Should().Be(other.Id);
        await _appointments.Received().ExpireHeldAsync(other.Id, Day, Now, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AssignStaffErrors()
    {
        var unskilled = Member("Cường");
        Register(unskilled);
        _staff.HasSkillAsync(unskilled.Id, _serviceId, Arg.Any<CancellationToken>()).Returns(false);
        (await AssignFails(unskilled.Id)).Should().Be("staff_not_qualified");

        var resigned = Member("Dũng");
        Register(resigned);
        resigned.Resign(Day);
        (await AssignFails(resigned.Id)).Should().Be("staff_not_on_shift");

        var locked = Member("Em");
        locked.User.Status = UserStatus.Locked;
        Register(locked);
        (await AssignFails(locked.Id)).Should().Be("staff_not_on_shift");

        (await AssignFails(Guid.NewGuid())).Should().Be("staff_not_found");
    }

    [Fact]
    public async Task AssignStaffWithoutShiftIsNotOnShift()
    {
        var other = Member("Giang");
        Register(other);
        _shifts.GetActiveRangesAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<DateOnly>(), Arg.Any<DateOnly>(), Arg.Any<CancellationToken>()).Returns([]);

        (await AssignFails(other.Id)).Should().Be("staff_not_on_shift");
    }

    [Fact]
    public async Task AssignStaffBusyIsStaffBusy()
    {
        var other = Member("Hà");
        Register(other);
        _appointments.GetOccupyingForStaffOnAsync(default!, default, default, default, default)
            .ReturnsForAnyArgs([(other.Id, At(9, 30), At(10, 30))]);

        (await AssignFails(other.Id)).Should().Be("staff_busy");
    }

    [Fact]
    public async Task AssignStaffOfStartedAppointmentIsInPast()
    {
        var other = Member("Khánh");
        Register(other);
        _appointment.Date = Today;
        _appointment.StartTime = At(0, 15);
        _appointment.EndTime = At(1, 15);

        (await AssignFails(other.Id)).Should().Be("appointment_in_past");
    }

    [Fact]
    public async Task AssignSameStaffChangesNothing()
    {
        await Assign(_member.Id);

        _appointment.StaffMemberId.Should().Be(_member.Id);
        await _appointments.DidNotReceiveWithAnyArgs().ExpireHeldAsync(default, default, default, default);
    }

    [Fact]
    public async Task CancelReleasesEntitlementAndSession()
    {
        await Create().CancelAsync(_appointment.Id, new CancelAppointmentRequest("  Khách báo bận  "), CancellationToken.None);

        _appointment.Status.Should().Be(AppointmentStatus.Cancelled);
        _appointment.CancellationReason.Should().Be("Khách báo bận");
        _appointment.CancelledAtUtc.Should().Be(Now);
        _appointment.ServiceEntitlement!.Status.Should().Be(EntitlementStatus.Available);
        _appointment.TreatmentSession!.Status.Should().Be(TreatmentSessionStatus.NotBooked);
    }

    [Fact]
    public async Task CancelCompletedIsStatusInvalid()
    {
        _appointment.Status = AppointmentStatus.Completed;

        var act = () => Create().CancelAsync(_appointment.Id, new CancelAppointmentRequest("x"), CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("appointment_status_invalid");
    }

    [Fact]
    public async Task NoShowBeforeStartIsTooEarly()
    {
        var act = () => Create().MarkNoShowAsync(_appointment.Id, new MarkNoShowRequest(null), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("no_show_too_early");
    }

    [Fact]
    public async Task NoShowAfterStartGivesEntitlementBackByDefault()
    {
        _appointment.Date = Today;
        _appointment.StartTime = At(0, 15);
        _appointment.EndTime = At(1, 15);

        await Create().MarkNoShowAsync(_appointment.Id, new MarkNoShowRequest("Gọi không nghe máy"), CancellationToken.None);

        _appointment.Status.Should().Be(AppointmentStatus.NoShow);
        _appointment.Note.Should().Be("Gọi không nghe máy");
        _appointment.ServiceEntitlement!.Status.Should().Be(EntitlementStatus.Available);
        _appointment.TreatmentSession!.Status.Should().Be(TreatmentSessionStatus.NotBooked);
    }

    [Fact]
    public async Task NoShowConsumesWhenConfigured()
    {
        _options = new BookingOptions { NoShowConsumesEntitlement = true };
        _appointment.Date = Today;
        _appointment.StartTime = At(0, 15);
        _appointment.EndTime = At(1, 15);

        await Create().MarkNoShowAsync(_appointment.Id, new MarkNoShowRequest(null), CancellationToken.None);

        _appointment.ServiceEntitlement!.Status.Should().Be(EntitlementStatus.Used);
        _appointment.TreatmentSession!.Status.Should().Be(TreatmentSessionStatus.Skipped);
    }

    [Fact]
    public async Task NoShowOfPendingIsStatusInvalid()
    {
        _appointment.Status = AppointmentStatus.PendingConfirmation;
        _appointment.Date = Today;
        _appointment.StartTime = At(0, 15);
        _appointment.EndTime = At(1, 15);

        var act = () => Create().MarkNoShowAsync(_appointment.Id, new MarkNoShowRequest(null), CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("appointment_status_invalid");
    }

    [Fact]
    public async Task ConfirmCases()
    {
        var act = () => Create().ConfirmAsync(_appointment.Id, CancellationToken.None);
        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("appointment_status_invalid");

        _appointment.Status = AppointmentStatus.PendingConfirmation;
        await Create().ConfirmAsync(_appointment.Id, CancellationToken.None);
        _appointment.Status.Should().Be(AppointmentStatus.Confirmed);
    }

    [Fact]
    public async Task HeldIsStatusInvalidForEveryCommand()
    {
        _appointment.Status = AppointmentStatus.Held;
        var service = Create();
        var commands = new Func<Task>[]
        {
            () => service.ConfirmAsync(_appointment.Id, CancellationToken.None),
            () => service.RescheduleAsync(_appointment.Id, new RescheduleAppointmentRequest(NextDay, At(9)), CancellationToken.None),
            () => service.AssignStaffAsync(_appointment.Id, new AssignAppointmentStaffRequest(Guid.NewGuid()), CancellationToken.None),
            () => service.CancelAsync(_appointment.Id, new CancelAppointmentRequest("x"), CancellationToken.None),
            () => service.MarkNoShowAsync(_appointment.Id, new MarkNoShowRequest(null), CancellationToken.None),
        };

        foreach (var command in commands)
            (await command.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("appointment_status_invalid");
    }

    [Fact]
    public async Task UnknownAppointmentIsNotFound()
    {
        var act = () => Create().CancelAsync(Guid.NewGuid(), new CancelAppointmentRequest("x"), CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("appointment_not_found");
    }

    [Fact]
    public async Task StaffSeesOnlyOwnDetail()
    {
        var assigned = Substitute.For<ICurrentUserService>();
        assigned.IsAuthenticated.Returns(true);
        assigned.Roles.Returns([Roles.Staff]);
        assigned.UserId.Returns(_member.Id);

        (await Create(assigned).GetAsync(_appointment.Id, CancellationToken.None)).Data!.Id.Should().Be(_appointment.Id);
        (await Create().GetAsync(_appointment.Id, CancellationToken.None)).Data.Should().NotBeNull();
        var act = () => Create(StaffTestDoubles.User(Roles.Staff)).GetAsync(_appointment.Id, CancellationToken.None);
        (await act.Should().ThrowAsync<ForbiddenException>()).Which.Code.Should().Be("appointment_not_assigned");
    }

    [Fact]
    public async Task ListPassesParsedFilters()
    {
        _appointments.SearchAsync(default!, default).ReturnsForAnyArgs(new PagedResult<AppointmentListItemDto>([], 1, 10, 0));
        var paging = new PagedQuery { PageNumber = 2, PageSize = 5, Search = " nguyen " };

        await Create().ListAsync(paging, new AppointmentListQuery { FromDate = Day, ToDate = NextDay, Status = "pending_confirmation" }, CancellationToken.None);

        await _appointments.Received().SearchAsync(
            new AppointmentSearchCriteria(Day, NextDay, null, AppointmentStatus.PendingConfirmation, "nguyen", 2, 5), Arg.Any<CancellationToken>());
    }
}
