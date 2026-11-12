using FluentAssertions;
using FluentValidation.TestHelper;
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

/// <summary>UC-SPA-23 A4, BR-STF-09: add shifts over a date range, skipping the invalid ones. Today in Vietnam is Tue 27/10/2026.</summary>
public sealed class WorkScheduleBatchTests
{
    private static readonly DateOnly Today = StaffTestDoubles.VietnamToday;
    private static readonly DateOnly NextMonday = new(2026, 11, 2);
    private static readonly TimeOnly Eight = new(8, 0);
    private static readonly TimeOnly Noon = new(12, 0);
    private static readonly IOptions<WorkScheduleOptions> Options = Microsoft.Extensions.Options.Options.Create(new WorkScheduleOptions());
    private static readonly DayOfWeek[] Weekdays = [DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday];

    private readonly IWorkScheduleRepository _shifts = Substitute.For<IWorkScheduleRepository>();
    private readonly IStaffMemberRepository _staff = Substitute.For<IStaffMemberRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly List<WorkSchedule> _added = [];
    private readonly StaffMember _an = Member("An");
    private readonly StaffMember _binh = Member("Bình");

    public WorkScheduleBatchTests()
    {
        _staff.GetWithUsersAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(call => new[] { _an, _binh }.Where(member => call.Arg<IReadOnlyCollection<Guid>>().Contains(member.Id)).ToList());
        _shifts.GetActiveRangesAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<DateOnly>(), Arg.Any<DateOnly>(), Arg.Any<CancellationToken>())
            .Returns([]);
        _shifts.AddAsync(Arg.Do<WorkSchedule>(_added.Add), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _unitOfWork.ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Func<CancellationToken, Task>>()(CancellationToken.None));
    }

    private WorkScheduleService Create() => new(_shifts, _staff, Substitute.For<IAppointmentRepository>(), _unitOfWork, StaffTestDoubles.Clock(),
        Options, new WorkScheduleQueryValidator(Options), new CreateWorkScheduleRequestValidator(), new UpdateWorkScheduleRequestValidator(),
        new ChangeWorkScheduleStatusRequestValidator(), new CreateWorkScheduleBatchRequestValidator(Options));

    private static CreateWorkScheduleBatchRequest Batch(IReadOnlyList<Guid>? staff, DateOnly from, DateOnly to, IReadOnlyList<DayOfWeek>? weekdays = null,
        TimeOnly? start = null, TimeOnly? end = null) => new(staff, from, to, weekdays, start ?? Eight, end ?? Noon);

    [Fact]
    public async Task CreatesWeekdayShiftsForEveryStaffMember()
    {
        var result = await Create().CreateBatchAsync(Batch([_an.Id, _binh.Id], NextMonday, NextMonday.AddDays(13), Weekdays), CancellationToken.None);

        result.Data!.Created.Should().HaveCount(20);
        result.Data.Skipped.Should().BeEmpty();
        result.Data.Created.Select(shift => shift.Date.DayOfWeek).Should().NotContain([DayOfWeek.Saturday, DayOfWeek.Sunday]);
        result.Data.Created.Should().BeInAscendingOrder(shift => shift.Date);
        result.Data.Created[0].StaffName.Should().Be("An");
        result.Data.Created.Should().OnlyContain(shift => shift.StartTime == Eight && shift.EndTime == Noon && shift.Status == WorkScheduleStatus.Active);
        _added.Should().HaveCount(20);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SkipsOverlapsAndResignedDaysWithReasons()
    {
        _binh.Resign(NextMonday.AddDays(3));
        _shifts.GetActiveRangesAsync(Arg.Any<IReadOnlyCollection<Guid>>(), NextMonday, NextMonday.AddDays(4), Arg.Any<CancellationToken>())
            .Returns([(_an.Id, NextMonday.AddDays(1), new TimeOnly(11, 0), new TimeOnly(13, 0)), (_an.Id, NextMonday.AddDays(2), Noon, new TimeOnly(17, 0))]);

        var result = await Create().CreateBatchAsync(Batch([_an.Id, _binh.Id], NextMonday, NextMonday.AddDays(4)), CancellationToken.None);

        result.Data!.Skipped.Select(skip => (skip.StaffMemberId, skip.Date, skip.Reason)).Should().BeEquivalentTo([
            (_an.Id, NextMonday.AddDays(1), "shift_conflict"),
            (_binh.Id, NextMonday.AddDays(3), "staff_resigned"),
            (_binh.Id, NextMonday.AddDays(4), "staff_resigned"),
        ]);
        result.Data.Skipped.Single(skip => skip.Reason == "shift_conflict").StaffName.Should().Be("An");
        result.Data.Created.Should().HaveCount(7);
        _added.Should().HaveCount(7);
    }

    [Fact]
    public async Task SkipsPastFarAndBeforeHireDates()
    {
        _an.HireDate = Today.AddDays(2);

        var result = await Create().CreateBatchAsync(Batch([_an.Id], Today.AddDays(-1), Today.AddDays(2)), CancellationToken.None);

        result.Data!.Skipped.Select(skip => (skip.Date, skip.Reason)).Should().Equal(
            (Today.AddDays(-1), "shift_date_out_of_range"), (Today, "shift_before_hire_date"), (Today.AddDays(1), "shift_before_hire_date"));
        result.Data.Created.Select(shift => shift.Date).Should().Equal(Today.AddDays(2));
    }

    [Fact]
    public async Task SkipsDaysBeyondMaxDaysAhead()
    {
        var result = await Create().CreateBatchAsync(Batch([_an.Id], Today.AddDays(59), Today.AddDays(62)), CancellationToken.None);

        result.Data!.Created.Select(shift => shift.Date).Should().Equal(Today.AddDays(59), Today.AddDays(60));
        result.Data.Skipped.Should().OnlyContain(skip => skip.Reason == "shift_date_out_of_range").And.HaveCount(2);
    }

    [Fact]
    public async Task NothingValidStillSucceedsWithoutSaving()
    {
        var result = await Create().CreateBatchAsync(Batch([_an.Id], Today.AddDays(-3), Today.AddDays(-1)), CancellationToken.None);

        result.Data!.Created.Should().BeEmpty();
        result.Data.Skipped.Should().HaveCount(3);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UnknownStaffFailsTheWholeRequest()
    {
        var act = () => Create().CreateBatchAsync(Batch([_an.Id, Guid.NewGuid()], NextMonday, NextMonday), CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("staff_not_found");
        _added.Should().BeEmpty();
    }

    [Fact]
    public void ValidatorRules()
    {
        var validator = new CreateWorkScheduleBatchRequestValidator(Options);
        var id = Guid.NewGuid();
        validator.TestValidate(Batch([id], NextMonday, NextMonday.AddDays(41), Weekdays)).ShouldNotHaveAnyValidationErrors();
        validator.TestValidate(Batch([], NextMonday, NextMonday)).ShouldHaveValidationErrorFor(request => request.StaffMemberIds);
        validator.TestValidate(Batch(null, NextMonday, NextMonday)).ShouldHaveValidationErrorFor(request => request.StaffMemberIds);
        validator.TestValidate(Batch([id, id], NextMonday, NextMonday)).ShouldHaveValidationErrorFor(request => request.StaffMemberIds);
        validator.TestValidate(Batch(Enumerable.Range(0, 51).Select(_ => Guid.NewGuid()).ToArray(), NextMonday, NextMonday))
            .ShouldHaveValidationErrorFor(request => request.StaffMemberIds);
        validator.TestValidate(Batch([id], NextMonday, NextMonday.AddDays(-1))).ShouldHaveValidationErrorFor(request => request.ToDate);
        validator.TestValidate(Batch([id], NextMonday, NextMonday.AddDays(42))).ShouldHaveValidationErrorFor(request => request.ToDate);
        validator.TestValidate(Batch([id], NextMonday, NextMonday, [])).ShouldHaveValidationErrorFor(request => request.Weekdays);
        validator.TestValidate(Batch([id], NextMonday, NextMonday, [DayOfWeek.Monday, DayOfWeek.Monday])).ShouldHaveValidationErrorFor(request => request.Weekdays);
        validator.TestValidate(Batch([id], NextMonday, NextMonday, start: Noon, end: Eight)).ShouldHaveValidationErrorFor(request => request.EndTime);
        validator.TestValidate(Batch([id], NextMonday, NextMonday, start: new TimeOnly(8, 0, 30))).ShouldHaveValidationErrorFor(request => request.StartTime);
    }

    [Fact]
    public void ValidatorRejectsRangeWithoutSelectedWeekdayAndTooManyShifts()
    {
        var validator = new CreateWorkScheduleBatchRequestValidator(Options);
        validator.TestValidate(Batch([Guid.NewGuid()], NextMonday, NextMonday, [DayOfWeek.Sunday])).IsValid.Should().BeFalse();

        var fifteenStaff = Enumerable.Range(0, 15).Select(_ => Guid.NewGuid()).ToArray();
        validator.TestValidate(Batch(fifteenStaff, NextMonday, NextMonday.AddDays(33))).IsValid.Should().BeFalse(); // 15 × 34 = 510 > 500
        validator.TestValidate(Batch(fifteenStaff, NextMonday, NextMonday.AddDays(32))).IsValid.Should().BeTrue(); // 15 × 33 = 495
    }

    private static StaffMember Member(string name)
    {
        var user = new User { FullName = name, Email = name + "@spa.vn", PhoneNumber = "0900000000", Role = UserRole.Staff, Status = UserStatus.Active };
        return new StaffMember { Id = user.Id, User = user, HireDate = new DateOnly(2026, 1, 1) };
    }
}
