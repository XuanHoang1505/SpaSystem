using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.WorkSchedules;
using NhuNguyetSpa.Application.Validators.WorkSchedules;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.WorkSchedules;

/// <summary>UC-SPA-23 (docs/specs/staff.md, BR-STF-03, BR-STF-06). Today in Vietnam is 27/10/2026, MaxDaysAhead = 60.</summary>
public sealed class WorkScheduleServiceTests
{
    private static readonly DateOnly Today = StaffTestDoubles.VietnamToday;
    private static readonly TimeOnly Eight = new(8, 0);
    private static readonly TimeOnly Noon = new(12, 0);
    private readonly IWorkScheduleRepository _shifts = Substitute.For<IWorkScheduleRepository>();
    private readonly IStaffMemberRepository _staff = Substitute.For<IStaffMemberRepository>();
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly StaffMember _member = new() { HireDate = new DateOnly(2026, 1, 1) };
    private readonly WorkSchedule _shift;

    public WorkScheduleServiceTests()
    {
        _staff.GetByIdAsync(_member.Id, Arg.Any<CancellationToken>()).Returns(_member);
        _shift = WorkSchedule.Create(_member.Id, Today.AddDays(1), Eight, Noon);
        _shifts.GetByIdAsync(_shift.Id, Arg.Any<CancellationToken>()).Returns(_shift);
        _shifts.GetDtoAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(call => new WorkScheduleDto(call.Arg<Guid>(), _member.Id, "An", Today, Eight, Noon, WorkScheduleStatus.Active));
        _appointments.GetOccupyingOnAsync(Arg.Any<Guid>(), Arg.Any<DateOnly>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>()).Returns([]);
    }

    private WorkScheduleService Create()
    {
        var options = Options.Create(new WorkScheduleOptions());
        return new WorkScheduleService(_shifts, _staff, _appointments, _unitOfWork, StaffTestDoubles.Clock(), options,
            new WorkScheduleQueryValidator(options), new CreateWorkScheduleRequestValidator(), new UpdateWorkScheduleRequestValidator(),
            new ChangeWorkScheduleStatusRequestValidator(), new CreateWorkScheduleBatchRequestValidator(options));
    }

    private Task<Domain.Exceptions.DomainException> CreateFails(DateOnly date, TimeOnly start, TimeOnly end) =>
        Fails(() => Create().CreateAsync(new CreateWorkScheduleRequest(_member.Id, date, start, end), CancellationToken.None));

    [Fact]
    public async Task CreateAllowsTodayAndLastDay()
    {
        await Create().CreateAsync(new CreateWorkScheduleRequest(_member.Id, Today, Eight, Noon), CancellationToken.None);
        await Create().CreateAsync(new CreateWorkScheduleRequest(_member.Id, Today.AddDays(60), Eight, Noon), CancellationToken.None);

        await _shifts.Received(2).AddAsync(Arg.Is<WorkSchedule>(shift => shift.StaffMemberId == _member.Id && shift.Status == WorkScheduleStatus.Active),
            Arg.Any<CancellationToken>());
        await _unitOfWork.Received(2).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateRejectsYesterdayAndTooFar()
    {
        (await CreateFails(Today.AddDays(-1), Eight, Noon)).Code.Should().Be("shift_date_out_of_range");
        (await CreateFails(Today.AddDays(61), Eight, Noon)).Code.Should().Be("shift_date_out_of_range");
    }

    [Fact]
    public async Task CreateRejectsBeforeHireAndFromResignation()
    {
        _member.HireDate = Today.AddDays(5);
        (await CreateFails(Today.AddDays(4), Eight, Noon)).Code.Should().Be("shift_before_hire_date");

        _member.HireDate = new DateOnly(2026, 1, 1);
        _member.Resign(Today.AddDays(10));
        (await CreateFails(Today.AddDays(10), Eight, Noon)).Code.Should().Be("staff_resigned");
        await Create().CreateAsync(new CreateWorkScheduleRequest(_member.Id, Today.AddDays(9), Eight, Noon), CancellationToken.None);
    }

    [Fact]
    public async Task CreateUnknownStaffIsNotFound()
    {
        var exception = await Fails(() => Create().CreateAsync(new CreateWorkScheduleRequest(Guid.NewGuid(), Today, Eight, Noon), CancellationToken.None));

        exception.Should().BeOfType<NotFoundException>().Which.Code.Should().Be("staff_not_found");
    }

    [Fact]
    public async Task CreateConflictWhenOverlap()
    {
        _shifts.HasActiveOverlapAsync(_member.Id, Today, Eight, Noon, null, Arg.Any<CancellationToken>()).Returns(true);

        var exception = await CreateFails(Today, Eight, Noon);

        exception.Should().BeOfType<ConflictException>().Which.Code.Should().Be("shift_conflict");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(8, 30, 11, 0, true)]
    [InlineData(9, 0, 10, 0, true)]
    [InlineData(9, 30, 12, 0, false)]
    public async Task UpdateKeepsAppointmentsInsideNewShift(int startHour, int startMinute, int endHour, int endMinute, bool allowed)
    {
        _appointments.GetOccupyingOnAsync(_member.Id, _shift.Date, StaffTestDoubles.Now, Arg.Any<CancellationToken>())
            .Returns([(new TimeOnly(9, 0), new TimeOnly(10, 0)), (new TimeOnly(13, 0), new TimeOnly(14, 0))]);
        var request = new UpdateWorkScheduleRequest(_shift.Date, new TimeOnly(startHour, startMinute), new TimeOnly(endHour, endMinute));

        if (allowed)
        {
            await Create().UpdateAsync(_shift.Id, request, CancellationToken.None);
            _shift.StartTime.Should().Be(new TimeOnly(startHour, startMinute));
            await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        }
        else
        {
            var exception = await Fails(() => Create().UpdateAsync(_shift.Id, request, CancellationToken.None));
            exception.Code.Should().Be("shift_has_appointments");
            exception.Message.Should().Contain("1 lịch hẹn");
            _shift.StartTime.Should().Be(Eight);
        }
    }

    [Fact]
    public async Task UpdateToAnotherDateNeedsAnEmptyShift()
    {
        _appointments.GetOccupyingOnAsync(_member.Id, _shift.Date, StaffTestDoubles.Now, Arg.Any<CancellationToken>())
            .Returns([(new TimeOnly(9, 0), new TimeOnly(10, 0))]);

        var exception = await Fails(() => Create().UpdateAsync(_shift.Id, new UpdateWorkScheduleRequest(_shift.Date.AddDays(1), Eight, Noon),
            CancellationToken.None));

        exception.Code.Should().Be("shift_has_appointments");
    }

    [Fact]
    public async Task UpdateExcludesItselfFromOverlapCheck()
    {
        await Create().UpdateAsync(_shift.Id, new UpdateWorkScheduleRequest(_shift.Date, Eight, new TimeOnly(13, 0)), CancellationToken.None);

        await _shifts.Received(1).HasActiveOverlapAsync(_member.Id, _shift.Date, Eight, new TimeOnly(13, 0), _shift.Id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateCancelledShiftConflicts()
    {
        _shift.Cancel();

        var exception = await Fails(() => Create().UpdateAsync(_shift.Id, new UpdateWorkScheduleRequest(_shift.Date, Eight, Noon), CancellationToken.None));

        exception.Should().BeOfType<ConflictException>().Which.Code.Should().Be("shift_cancelled");
    }

    [Fact]
    public async Task UpdatePastShiftRejected()
    {
        var past = WorkSchedule.Create(_member.Id, Today.AddDays(-1), Eight, Noon);
        _shifts.GetByIdAsync(past.Id, Arg.Any<CancellationToken>()).Returns(past);

        var exception = await Fails(() => Create().UpdateAsync(past.Id, new UpdateWorkScheduleRequest(Today, Eight, Noon), CancellationToken.None));

        exception.Code.Should().Be("shift_in_past");
    }

    [Fact]
    public async Task UpdateUnknownShiftIsNotFound()
    {
        var exception = await Fails(() => Create().UpdateAsync(Guid.NewGuid(), new UpdateWorkScheduleRequest(Today, Eight, Noon), CancellationToken.None));

        exception.Code.Should().Be("work_schedule_not_found");
    }

    [Fact]
    public async Task CancelWithAppointmentConflicts()
    {
        _appointments.GetOccupyingOnAsync(_member.Id, _shift.Date, StaffTestDoubles.Now, Arg.Any<CancellationToken>())
            .Returns([(new TimeOnly(11, 0), new TimeOnly(12, 0))]);

        var exception = await Fails(() => Create().ChangeStatusAsync(_shift.Id, new ChangeWorkScheduleStatusRequest("cancelled"), CancellationToken.None));

        exception.Code.Should().Be("shift_has_appointments");
        _shift.Status.Should().Be(WorkScheduleStatus.Active);
    }

    [Fact]
    public async Task CancelIgnoresAppointmentsOutsideTheShift()
    {
        _appointments.GetOccupyingOnAsync(_member.Id, _shift.Date, StaffTestDoubles.Now, Arg.Any<CancellationToken>())
            .Returns([(Noon, new TimeOnly(13, 0))]);

        await Create().ChangeStatusAsync(_shift.Id, new ChangeWorkScheduleStatusRequest("cancelled"), CancellationToken.None);

        _shift.Status.Should().Be(WorkScheduleStatus.Cancelled);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CancelTwiceIsNoOp()
    {
        _shift.Cancel();

        await Create().ChangeStatusAsync(_shift.Id, new ChangeWorkScheduleStatusRequest("cancelled"), CancellationToken.None);

        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CancelPastShiftRejected()
    {
        var past = WorkSchedule.Create(_member.Id, Today.AddDays(-1), Eight, Noon);
        _shifts.GetByIdAsync(past.Id, Arg.Any<CancellationToken>()).Returns(past);

        var exception = await Fails(() => Create().ChangeStatusAsync(past.Id, new ChangeWorkScheduleStatusRequest("cancelled"), CancellationToken.None));

        exception.Code.Should().Be("shift_in_past");
    }

    [Fact]
    public async Task ListPassesRangeAndFilters()
    {
        _shifts.ListAsync(Arg.Any<DateOnly>(), Arg.Any<DateOnly>(), Arg.Any<Guid?>(), Arg.Any<WorkScheduleStatus?>(), Arg.Any<CancellationToken>())
            .Returns([]);

        await Create().ListAsync(new WorkScheduleQuery { FromDate = Today, ToDate = Today.AddDays(6), StaffMemberId = _member.Id, Status = "cancelled" },
            CancellationToken.None);

        await _shifts.Received(1).ListAsync(Today, Today.AddDays(6), _member.Id, WorkScheduleStatus.Cancelled, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ListWithUnknownStaffIsNotFound()
    {
        var exception = await Fails(() => Create().ListAsync(new WorkScheduleQuery { FromDate = Today, ToDate = Today, StaffMemberId = Guid.NewGuid() },
            CancellationToken.None));

        exception.Code.Should().Be("staff_not_found");
    }

    private static async Task<Domain.Exceptions.DomainException> Fails(Func<Task> action)
    {
        try
        {
            await action();
        }
        catch (Domain.Exceptions.DomainException exception)
        {
            return exception;
        }
        throw new InvalidOperationException("Expected a domain exception.");
    }
}
