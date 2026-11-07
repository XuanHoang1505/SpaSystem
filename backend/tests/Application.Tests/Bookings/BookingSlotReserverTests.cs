using FluentAssertions;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Bookings;

/// <summary>
/// The in-transaction slot check of UC-SPA-15 (docs/specs/bookings.md A9, BR-BKG-01..04, 14). The clock is 09:00 VN on 30/10/2026;
/// bookings are for 31/10 with a shift 08:00–12:00 for everyone unless a test says otherwise.
/// </summary>
public sealed class BookingSlotReserverTests
{
    private static readonly DateTime Now = new(2026, 10, 30, 2, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly Day = new(2026, 10, 31);
    private readonly IStaffMemberRepository _staff = Substitute.For<IStaffMemberRepository>();
    private readonly IWorkScheduleRepository _shifts = Substitute.For<IWorkScheduleRepository>();
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly Guid _customerId = Guid.NewGuid();
    private readonly Guid _serviceId = Guid.NewGuid();
    private readonly AvailabilityCandidate _an = new(Guid.Parse("00000000-0000-0000-0000-000000000001"), "An");
    private readonly AvailabilityCandidate _binh = new(Guid.Parse("00000000-0000-0000-0000-000000000002"), "Bình");
    private readonly List<(Guid StaffMemberId, TimeOnly Start, TimeOnly End)> _busy = [];
    private readonly List<(TimeOnly Start, TimeOnly End)> _customerBusy = [];
    private List<(TimeOnly Start, TimeOnly End)> _shiftRanges = [(At(8), At(12))];
    private readonly BookingSlotReserver _reserver;

    public BookingSlotReserverTests()
    {
        _staff.GetAvailabilityCandidatesAsync(_serviceId, Day, null, Arg.Any<CancellationToken>()).Returns([_an, _binh]);
        _staff.GetAvailabilityCandidatesAsync(_serviceId, Day, _an.StaffMemberId, Arg.Any<CancellationToken>()).Returns([_an]);
        _shifts.GetActiveRangesAsync(default!, default, default, default).ReturnsForAnyArgs(call =>
            call.ArgAt<IReadOnlyCollection<Guid>>(0)
                .SelectMany(id => _shiftRanges.Select(range => (id, call.ArgAt<DateOnly>(1), range.Start, range.End))).ToList());
        _appointments.GetOccupyingForStaffOnAsync(default!, default, default, default, default).ReturnsForAnyArgs(_ => _busy);
        _appointments.GetCustomerOccupyingOnAsync(default, default, default, default, default).ReturnsForAnyArgs(_ => _customerBusy);
        var clock = Substitute.For<IDateTimeProvider>();
        clock.UtcNow.Returns(Now);
        _reserver = new BookingSlotReserver(_staff, _shifts, _appointments, clock);
    }

    private static TimeOnly At(int hour, int minute = 0) => new(hour, minute);

    private Task<ReservedSlot> Reserve(TimeOnly start, Guid? staffId = null, DateOnly? date = null, int duration = 60) =>
        _reserver.ReserveAsync(_customerId, _serviceId, date ?? Day, start, duration, staffId, CancellationToken.None);

    [Fact]
    public async Task SpecificStaffFreeIsReserved()
    {
        var slot = await Reserve(At(9), _an.StaffMemberId);

        slot.Should().Be(new ReservedSlot(_an.StaffMemberId, At(10)));
    }

    [Fact]
    public async Task EndWrappingMidnightIsOutsideSchedule()
    {
        var act = () => Reserve(At(23, 30), _an.StaffMemberId);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(BookingErrors.OutsideWorkScheduleCode);
    }

    [Fact]
    public async Task StartInPastIsInPast()
    {
        var act = () => Reserve(At(8, 30), _an.StaffMemberId, new DateOnly(2026, 10, 30));

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be(BookingErrors.AppointmentInPastCode);
    }

    [Fact]
    public async Task UnknownStaffIsStaffNotFound()
    {
        var unknown = Guid.NewGuid();
        _staff.GetAvailabilityCandidatesAsync(_serviceId, Day, unknown, Arg.Any<CancellationToken>()).Returns([]);
        _staff.GetWithUsersAsync(default!, default).ReturnsForAnyArgs([]);

        var act = () => Reserve(At(9), unknown);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("staff_not_found");
    }

    [Fact]
    public async Task LockedAccountIsStaffNotFound()
    {
        var locked = Member("Chi", UserStatus.Locked);
        _staff.GetAvailabilityCandidatesAsync(_serviceId, Day, locked.Id, Arg.Any<CancellationToken>()).Returns([]);
        _staff.GetWithUsersAsync(default!, default).ReturnsForAnyArgs([locked]);

        var act = () => Reserve(At(9), locked.Id);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("staff_not_found");
    }

    [Fact]
    public async Task UnqualifiedStaffIsStaffNotQualified()
    {
        var other = Member("Dung");
        _staff.GetAvailabilityCandidatesAsync(_serviceId, Day, other.Id, Arg.Any<CancellationToken>()).Returns([]);
        _staff.GetWithUsersAsync(default!, default).ReturnsForAnyArgs([other]);
        _staff.HasSkillAsync(other.Id, _serviceId, Arg.Any<CancellationToken>()).Returns(false);

        var act = () => Reserve(At(9), other.Id);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be(BookingErrors.StaffNotQualifiedCode);
    }

    [Fact]
    public async Task NotWorkingThatDayIsOutsideSchedule()
    {
        var resigned = Member("Em");
        _staff.GetAvailabilityCandidatesAsync(_serviceId, Day, resigned.Id, Arg.Any<CancellationToken>()).Returns([]);
        _staff.GetWithUsersAsync(default!, default).ReturnsForAnyArgs([resigned]);
        _staff.HasSkillAsync(resigned.Id, _serviceId, Arg.Any<CancellationToken>()).Returns(true);

        var act = () => Reserve(At(9), resigned.Id);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(BookingErrors.OutsideWorkScheduleCode);
    }

    [Fact]
    public async Task SpanningTwoShiftsIsOutsideSchedule()
    {
        _shiftRanges = [(At(8), At(10)), (At(10), At(12))];

        var act = () => Reserve(At(9, 30), _an.StaffMemberId);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(BookingErrors.OutsideWorkScheduleCode);
    }

    [Fact]
    public async Task BusyStaffIsSlotUnavailable()
    {
        _busy.Add((_an.StaffMemberId, At(9, 30), At(10, 30)));

        var act = () => Reserve(At(9), _an.StaffMemberId);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(BookingErrors.SlotUnavailableCode);
    }

    [Fact]
    public async Task CustomerBusyAfterStaffCheck()
    {
        _customerBusy.Add((At(9, 30), At(10, 30)));

        var act = () => Reserve(At(9), _an.StaffMemberId);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(BookingErrors.CustomerBusyCode);
    }

    [Fact]
    public async Task AutoPicksLeastBusy()
    {
        _busy.Add((_an.StaffMemberId, At(10), At(11)));
        _busy.Add((_an.StaffMemberId, At(11), At(12)));

        var slot = await Reserve(At(9));

        slot.StaffMemberId.Should().Be(_binh.StaffMemberId);
    }

    [Fact]
    public async Task AutoSkipsBusyStaffEvenIfLeastBusy()
    {
        _busy.Add((_binh.StaffMemberId, At(9), At(10)));
        _busy.Add((_an.StaffMemberId, At(10), At(11)));
        _busy.Add((_an.StaffMemberId, At(11), At(12)));

        var slot = await Reserve(At(9));

        slot.StaffMemberId.Should().Be(_an.StaffMemberId);
    }

    [Fact]
    public async Task AutoWithNobodyFreeIsSlotUnavailable()
    {
        _busy.Add((_an.StaffMemberId, At(9), At(10)));
        _busy.Add((_binh.StaffMemberId, At(8, 30), At(9, 30)));

        var act = () => Reserve(At(9));

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(BookingErrors.SlotUnavailableCode);
    }

    [Fact]
    public async Task AutoWithNoShiftCoveringIsSlotUnavailable()
    {
        var act = () => Reserve(At(11, 30));

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(BookingErrors.SlotUnavailableCode);
    }

    [Fact]
    public async Task LocksStaffThenCustomerThenExpires()
    {
        await Reserve(At(9));

        Received.InOrder(() =>
        {
            _staff.LockManyForBookingAsync(
                Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.SequenceEqual(new[] { _an.StaffMemberId, _binh.StaffMemberId })),
                Arg.Any<CancellationToken>());
            _appointments.LockCustomerForBookingAsync(_customerId, Arg.Any<CancellationToken>());
            _appointments.ExpireHeldAsync(_an.StaffMemberId, Day, Now, Arg.Any<CancellationToken>());
            _appointments.GetOccupyingForStaffOnAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Day, Now, null, Arg.Any<CancellationToken>());
        });
    }

    private static StaffMember Member(string name, UserStatus status = UserStatus.Active)
    {
        var user = new User { FullName = name, Role = UserRole.Staff, Status = status };
        return new StaffMember { Id = user.Id, User = user, HireDate = new DateOnly(2026, 1, 1) };
    }

    [Fact]
    public async Task ReserveExcludesOwnAppointmentForAnyStaff()
    {
        var own = Guid.NewGuid();
        // Without the exclusion An is busy with the very appointment being moved, and Bình is busy anyway.
        _appointments.GetOccupyingForStaffOnAsync(default!, default, default, default, default).ReturnsForAnyArgs(call =>
            call.ArgAt<Guid?>(3) == own
                ? [(_binh.StaffMemberId, At(9), At(10))]
                : new List<(Guid, TimeOnly, TimeOnly)> { (_an.StaffMemberId, At(9), At(10)), (_binh.StaffMemberId, At(9), At(10)) });
        _appointments.GetCustomerOccupyingOnAsync(default, default, default, default, default).ReturnsForAnyArgs(call =>
            call.ArgAt<Guid?>(3) == own ? [] : new List<(TimeOnly, TimeOnly)> { (At(9), At(10)) });

        var slot = await _reserver.ReserveAsync(_customerId, _serviceId, Day, At(9, 30), 60, null, CancellationToken.None, excludeAppointmentId: own);

        slot.Should().Be(new ReservedSlot(_an.StaffMemberId, At(10, 30)));
        await _appointments.Received().GetCustomerOccupyingOnAsync(_customerId, Day, Now, own, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ReserveWithoutExcludePassesNull()
    {
        await Reserve(At(9), _an.StaffMemberId);

        await _appointments.Received().GetOccupyingForStaffOnAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Day, Now, null, Arg.Any<CancellationToken>());
        await _appointments.Received().GetCustomerOccupyingOnAsync(_customerId, Day, Now, null, Arg.Any<CancellationToken>());
    }
}
