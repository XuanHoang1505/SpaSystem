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
/// UC-SPA-16 (docs/specs/bookings.md, BR-BKG-07, 16, 17). Clock: 09:00 VN on 04/11/2026; the customer's appointment is with An on
/// 06/11 10:00–11:00, booked with a bought service; An and Bình both work 08:00–18:00 and can do the service.
/// </summary>
public sealed class MyAppointmentServiceTests
{
    private static readonly DateTime Now = new(2026, 11, 4, 2, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly Visit = new(2026, 11, 6);
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IPurchaseRepository _purchases = Substitute.For<IPurchaseRepository>();
    private readonly IStaffMemberRepository _staff = Substitute.For<IStaffMemberRepository>();
    private readonly IWorkScheduleRepository _shifts = Substitute.For<IWorkScheduleRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _user = StaffTestDoubles.User(Roles.Customer);
    private readonly IDateTimeProvider _clock = Substitute.For<IDateTimeProvider>();
    private readonly Guid _serviceId = Guid.NewGuid();
    private readonly AvailabilityCandidate _an = new(Guid.Parse("00000000-0000-0000-0000-000000000001"), "An");
    private readonly AvailabilityCandidate _binh = new(Guid.Parse("00000000-0000-0000-0000-000000000002"), "Bình");
    private readonly Appointment _appointment;
    private List<(TimeOnly Start, TimeOnly End)> _customerBusyWithoutExclusion = [];

    public MyAppointmentServiceTests()
    {
        _clock.UtcNow.Returns(Now);
        _appointment = new Appointment
        {
            CustomerId = CustomerId,
            StaffMemberId = _an.StaffMemberId,
            Date = Visit,
            StartTime = At(10),
            EndTime = At(11),
            Status = AppointmentStatus.Confirmed,
            ServiceEntitlement = new ServiceEntitlement { Status = EntitlementStatus.Booked },
        };
        _appointment.ServiceEntitlementId = _appointment.ServiceEntitlement.Id;
        _appointments.GetForUpdateAsync(_appointment.Id, Arg.Any<CancellationToken>()).Returns((_appointment, _serviceId));
        _appointments.GetMineAsync(_appointment.Id, CustomerId, Arg.Any<CancellationToken>()).Returns(_ => new MyAppointmentRow(
            new MyAppointmentDto(_appointment.Id, _appointment.Date, _appointment.StartTime, _appointment.EndTime, _appointment.Status, null,
                _appointment.CancelledAtUtc, _appointment.CancellationReason, Now, new AppointmentServiceDto(_serviceId, "Chăm sóc da"),
                new AppointmentStaffDto(_appointment.StaffMemberId, "An"), AppointmentBookingSource.Entitlement, null, null, null),
            new AppointmentChangeFacts(_appointment.Status, _appointment.Date, _appointment.StartTime, null, null, null, null)));
        _staff.GetAvailabilityCandidatesAsync(_serviceId, Arg.Any<DateOnly>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(call => call.ArgAt<Guid?>(2) is { } id ? new[] { _an, _binh }.Where(c => c.StaffMemberId == id).ToList() : [_an, _binh]);
        _shifts.GetActiveRangesAsync(default!, default, default, default).ReturnsForAnyArgs(call =>
            call.ArgAt<IReadOnlyCollection<Guid>>(0).Select(id => (id, call.ArgAt<DateOnly>(1), At(8), At(18))).ToList());
        // The appointment being moved occupies An 10:00–11:00 on its day unless the caller excludes it.
        _appointments.GetOccupyingForStaffOnAsync(default!, default, default, default, default).ReturnsForAnyArgs(call =>
            call.ArgAt<Guid?>(3) == _appointment.Id || call.ArgAt<DateOnly>(1) != _appointment.Date
                ? []
                : new List<(Guid, TimeOnly, TimeOnly)> { (_an.StaffMemberId, _appointment.StartTime, _appointment.EndTime) });
        _appointments.GetCustomerOccupyingOnAsync(default, default, default, default, default).ReturnsForAnyArgs(call =>
            call.ArgAt<Guid?>(3) == _appointment.Id ? [] : _customerBusyWithoutExclusion);
        _unitOfWork.ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Func<CancellationToken, Task>>()(CancellationToken.None));
    }

    private Guid CustomerId => _user.UserId!.Value;

    private static TimeOnly At(int hour, int minute = 0) => new(hour, minute);

    private MyAppointmentService Create()
    {
        var options = Options.Create(new BookingOptions());
        return new MyAppointmentService(_appointments, _purchases, new BookingSlotReserver(_staff, _shifts, _appointments, _clock),
            new MyAppointmentReader(_appointments, _clock, options), _unitOfWork, _user, _clock, options,
            new PagedQueryValidator(), new MyAppointmentListQueryValidator(), new RescheduleMyAppointmentRequestValidator(_clock, options),
            new CancelAppointmentRequestValidator());
    }

    private Task<OperationResult<MyAppointmentDto>> Reschedule(DateOnly date, TimeOnly start, Guid? staffId = null) =>
        Create().RescheduleAsync(_appointment.Id, new RescheduleMyAppointmentRequest(date, start, staffId), default);

    private Task<OperationResult<MyAppointmentDto>> Cancel(string reason = "Bận việc") =>
        Create().CancelAsync(_appointment.Id, new CancelAppointmentRequest(reason), default);

    private static (MyAppointmentListItemDto Item, AppointmentChangeFacts Facts) ListRow(AppointmentStatus status, DateOnly date) => (
        new MyAppointmentListItemDto(Guid.NewGuid(), date, new TimeOnly(10, 0), new TimeOnly(11, 0), status, null,
            new AppointmentServiceDto(Guid.NewGuid(), "Chăm sóc da"), new AppointmentStaffDto(Guid.NewGuid(), "An"),
            AppointmentBookingSource.Entitlement, null),
        new AppointmentChangeFacts(status, date, new TimeOnly(10, 0), null, null, null, null));

    [Fact]
    public async Task ListFillsFlagsAndPassesCriteria()
    {
        MyAppointmentSearchCriteria? seen = null;
        _appointments.SearchMineAsync(CustomerId, Arg.Do<MyAppointmentSearchCriteria>(criteria => seen = criteria), Arg.Any<CancellationToken>())
            .Returns(new PagedResult<(MyAppointmentListItemDto, AppointmentChangeFacts)>(
                [ListRow(AppointmentStatus.Confirmed, Visit), ListRow(AppointmentStatus.Confirmed, new DateOnly(2026, 11, 4))], 2, 5, 7));

        var page = (await Create().ListAsync(new PagedQuery { PageNumber = 2, PageSize = 5 },
            new MyAppointmentListQuery { Scope = "upcoming", Status = "confirmed", FromDate = Visit }, default)).Data!;

        seen.Should().Be(new MyAppointmentSearchCriteria(MyAppointmentScope.Upcoming, AppointmentStatus.Confirmed, Visit, null, 2, 5));
        page.TotalCount.Should().Be(7);
        page.Items.Select(item => (item.CanReschedule, item.CanCancel)).Should().Equal((true, true), (false, false));
    }

    [Fact]
    public async Task RescheduleOthersAppointmentIsNotFound()
    {
        _appointment.CustomerId = Guid.NewGuid();

        (await FluentActions.Invoking(() => Reschedule(Visit.AddDays(1), At(9))).Should().ThrowAsync<NotFoundException>())
            .Which.Code.Should().Be("appointment_not_found");
    }

    [Fact]
    public async Task CancelOthersAppointmentIsNotFound()
    {
        _appointment.CustomerId = Guid.NewGuid();

        (await FluentActions.Invoking(() => Cancel()).Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("appointment_not_found");
        _appointment.Status.Should().Be(AppointmentStatus.Confirmed);
    }

    [Fact]
    public async Task RescheduleInsideCutoffIsRefused()
    {
        _appointment.Date = new DateOnly(2026, 11, 4);
        _appointment.StartTime = At(20);
        _appointment.EndTime = At(21);

        (await FluentActions.Invoking(() => Reschedule(Visit, At(9))).Should().ThrowAsync<BusinessRuleException>())
            .Which.Code.Should().Be("change_window_passed");
    }

    [Fact]
    public async Task RescheduleHeldIsStatusInvalid()
    {
        _appointment.Status = AppointmentStatus.Held;

        (await FluentActions.Invoking(() => Reschedule(Visit, At(14))).Should().ThrowAsync<ConflictException>())
            .Which.Code.Should().Be("appointment_status_invalid");
    }

    [Fact]
    public async Task RescheduleKeepsDurationAndStatusAndSetsPickedStaff()
    {
        await Reschedule(Visit.AddDays(1), At(14), _binh.StaffMemberId);

        (_appointment.Date, _appointment.StartTime, _appointment.EndTime).Should().Be((Visit.AddDays(1), At(14), At(15)));
        _appointment.StaffMemberId.Should().Be(_binh.StaffMemberId);
        _appointment.Status.Should().Be(AppointmentStatus.Confirmed);
        await _appointments.Received().GetOccupyingForStaffOnAsync(
            Arg.Any<IReadOnlyCollection<Guid>>(), Visit.AddDays(1), Now, _appointment.Id, Arg.Any<CancellationToken>());
        await _unitOfWork.Received().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RescheduleWithAnyStaffMayKeepCurrentStaff()
    {
        // Bình is busy at 10:30; An is free once the appointment does not block itself.
        _appointments.GetOccupyingForStaffOnAsync(default!, default, default, default, default).ReturnsForAnyArgs(call =>
            call.ArgAt<Guid?>(3) == _appointment.Id
                ? [(_binh.StaffMemberId, At(10), At(12))]
                : new List<(Guid, TimeOnly, TimeOnly)> { (_an.StaffMemberId, At(10), At(11)), (_binh.StaffMemberId, At(10), At(12)) });

        await Reschedule(Visit, At(10, 30));

        (_appointment.StaffMemberId, _appointment.StartTime, _appointment.EndTime).Should().Be((_an.StaffMemberId, At(10, 30), At(11, 30)));
    }

    [Fact]
    public async Task RescheduleToOtherStaffOverlappingOwnSlotSucceeds()
    {
        _customerBusyWithoutExclusion = [(At(10), At(11))];

        await Reschedule(Visit, At(10, 30), _binh.StaffMemberId);

        (_appointment.StaffMemberId, _appointment.StartTime).Should().Be((_binh.StaffMemberId, At(10, 30)));
    }

    [Fact]
    public async Task RescheduleToSameSlotDoesNothing()
    {
        await Reschedule(Visit, At(10));

        await _staff.DidNotReceiveWithAnyArgs().LockManyForBookingAsync(default!, default);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
        (_appointment.StaffMemberId, _appointment.StartTime).Should().Be((_an.StaffMemberId, At(10)));
    }

    [Fact]
    public async Task RescheduleSessionChecksPackageOrder()
    {
        var session = new TreatmentSession { Status = TreatmentSessionStatus.Booked, SequenceNumber = 2 };
        _appointment.ServiceEntitlement = null;
        _appointment.ServiceEntitlementId = null;
        _appointment.TreatmentSession = session;
        _appointment.TreatmentSessionId = session.Id;
        _purchases.GetSessionFactsAsync(session.Id, CustomerId, Arg.Any<CancellationToken>()).Returns(new SessionBookingFacts(
            session.Id, _serviceId, 60, 2, TreatmentSessionStatus.Booked, CustomerPackageStatus.Active, Now.AddDays(60),
            TreatmentPlanStatus.InProgress, true, null, 7, new NextVisit(Visit.AddDays(10), At(9), 7)));

        (await FluentActions.Invoking(() => Reschedule(Visit.AddDays(4), At(9))).Should().ThrowAsync<BusinessRuleException>())
            .Which.Code.Should().Be("session_too_late");
        await _staff.DidNotReceiveWithAnyArgs().LockManyForBookingAsync(default!, default);
    }

    [Fact]
    public async Task RescheduleSessionRechecksOrderAfterCustomerLock()
    {
        var session = new TreatmentSession { Status = TreatmentSessionStatus.Booked, SequenceNumber = 2 };
        _appointment.ServiceEntitlement = null;
        _appointment.ServiceEntitlementId = null;
        _appointment.TreatmentSession = session;
        _appointment.TreatmentSessionId = session.Id;
        SessionBookingFacts Facts(NextVisit? next) => new(session.Id, _serviceId, 60, 2, TreatmentSessionStatus.Booked,
            CustomerPackageStatus.Active, Now.AddDays(60), TreatmentPlanStatus.InProgress, true, null, 7, next);
        // A concurrent move of session 3 commits while this request waits for the customer row: the second read sees it.
        _purchases.GetSessionFactsAsync(session.Id, CustomerId, Arg.Any<CancellationToken>())
            .Returns(Facts(null), Facts(new NextVisit(Visit.AddDays(2), At(9), 7)));

        (await FluentActions.Invoking(() => Reschedule(Visit.AddDays(1), At(9))).Should().ThrowAsync<BusinessRuleException>())
            .Which.Code.Should().Be("session_too_late");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RescheduleExpiredEntitlementIsNotEligible()
    {
        _appointment.ServiceEntitlement!.ExpiresAtUtc = Now.AddMinutes(-1);

        (await FluentActions.Invoking(() => Reschedule(Visit.AddDays(1), At(9))).Should().ThrowAsync<ConflictException>())
            .Which.Code.Should().Be("entitlement_not_eligible");
    }

    [Fact]
    public async Task CancelReleasesSessionAndRecordsReason()
    {
        var session = new TreatmentSession { Status = TreatmentSessionStatus.Booked };
        _appointment.ServiceEntitlement = null;
        _appointment.TreatmentSession = session;

        await Cancel("  Có việc gấp  ");

        session.Status.Should().Be(TreatmentSessionStatus.NotBooked);
        (_appointment.Status, _appointment.CancellationReason, _appointment.CancelledAtUtc)
            .Should().Be((AppointmentStatus.Cancelled, "Có việc gấp", (DateTime?)Now));
        await _unitOfWork.Received().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CancelPaidBookNowReleasesEntitlement()
    {
        _appointment.OrderItemId = Guid.NewGuid();

        await Cancel();

        _appointment.ServiceEntitlement!.Status.Should().Be(EntitlementStatus.Available);
        _appointment.Status.Should().Be(AppointmentStatus.Cancelled);
    }

    [Fact]
    public async Task CancelInsideCutoffIsRefused()
    {
        _appointment.Date = new DateOnly(2026, 11, 5);
        _appointment.StartTime = At(8);

        (await FluentActions.Invoking(() => Cancel()).Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("change_window_passed");
        _appointment.ServiceEntitlement!.Status.Should().Be(EntitlementStatus.Booked);
    }

    [Fact]
    public async Task CancelHeldIsStatusInvalid()
    {
        _appointment.Status = AppointmentStatus.Held;

        (await FluentActions.Invoking(() => Cancel()).Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("appointment_status_invalid");
    }
}
