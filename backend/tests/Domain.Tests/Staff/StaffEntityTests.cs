using FluentAssertions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Domain.Tests.Staff;

/// <summary>State changes of StaffMember and WorkSchedule (docs/specs/staff.md, BR-STF-01, BR-STF-03).</summary>
public sealed class StaffEntityTests
{
    private static readonly DateOnly HireDate = new(2026, 1, 1);
    private static readonly TimeOnly Eight = new(8, 0);
    private static readonly TimeOnly Noon = new(12, 0);

    [Fact]
    public void ResignBeforeHireDateThrows()
    {
        var staff = new StaffMember { HireDate = HireDate };

        FluentActions.Invoking(() => staff.Resign(HireDate.AddDays(-1))).Should().Throw<InvalidOperationException>();
        staff.ResignationDate.Should().BeNull();
    }

    [Fact]
    public void ResignTwiceThrows()
    {
        var staff = new StaffMember { HireDate = HireDate };
        staff.Resign(new DateOnly(2026, 11, 1));

        FluentActions.Invoking(() => staff.Resign(new DateOnly(2026, 12, 1))).Should().Throw<InvalidOperationException>();
        staff.ResignationDate.Should().Be(new DateOnly(2026, 11, 1));
    }

    [Fact]
    public void ResignOnHireDateIsAllowed()
    {
        var staff = new StaffMember { HireDate = HireDate };
        staff.Resign(HireDate);
        staff.ResignationDate.Should().Be(HireDate);
    }

    [Fact]
    public void IsWorkingOnIsFalseFromResignationDate()
    {
        var staff = new StaffMember { HireDate = HireDate };
        staff.IsWorkingOn(new DateOnly(2030, 1, 1)).Should().BeTrue();

        staff.Resign(new DateOnly(2026, 11, 1));

        staff.IsWorkingOn(new DateOnly(2026, 10, 31)).Should().BeTrue();
        staff.IsWorkingOn(new DateOnly(2026, 11, 1)).Should().BeFalse();
    }

    [Fact]
    public void ReplaceSkillsReplacesWholeList()
    {
        var staff = new StaffMember { Id = Guid.NewGuid() };
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        var third = Guid.NewGuid();
        staff.ReplaceSkills([first, second]);

        staff.ReplaceSkills([third]);

        staff.Skills.Should().ContainSingle()
            .Which.Should().Match<StaffSkill>(skill => skill.SpaServiceId == third && skill.StaffMemberId == staff.Id);
    }

    [Fact]
    public void CreateMakesActiveShift()
    {
        var staffId = Guid.NewGuid();
        var shift = WorkSchedule.Create(staffId, new DateOnly(2026, 11, 2), Eight, Noon);

        shift.Id.Should().NotBeEmpty();
        shift.StaffMemberId.Should().Be(staffId);
        shift.Status.Should().Be(WorkScheduleStatus.Active);
        (shift.StartTime, shift.EndTime).Should().Be((Eight, Noon));
    }

    [Theory]
    [InlineData(12, 12)]
    [InlineData(12, 8)]
    public void CreateRejectsEndNotAfterStart(int start, int end)
    {
        FluentActions.Invoking(() => WorkSchedule.Create(Guid.NewGuid(), new DateOnly(2026, 11, 2), new TimeOnly(start, 0), new TimeOnly(end, 0)))
            .Should().Throw<ArgumentException>();
    }

    [Fact]
    public void RescheduleChangesDateAndTimes()
    {
        var shift = WorkSchedule.Create(Guid.NewGuid(), new DateOnly(2026, 11, 2), Eight, Noon);

        shift.Reschedule(new DateOnly(2026, 11, 3), new TimeOnly(13, 0), new TimeOnly(17, 0));

        shift.Date.Should().Be(new DateOnly(2026, 11, 3));
        (shift.StartTime, shift.EndTime).Should().Be((new TimeOnly(13, 0), new TimeOnly(17, 0)));
    }

    [Fact]
    public void RescheduleCancelledShiftThrows()
    {
        var shift = WorkSchedule.Create(Guid.NewGuid(), new DateOnly(2026, 11, 2), Eight, Noon);
        shift.Cancel();

        FluentActions.Invoking(() => shift.Reschedule(new DateOnly(2026, 11, 3), Eight, Noon)).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void RescheduleRejectsEndNotAfterStart()
    {
        var shift = WorkSchedule.Create(Guid.NewGuid(), new DateOnly(2026, 11, 2), Eight, Noon);

        FluentActions.Invoking(() => shift.Reschedule(new DateOnly(2026, 11, 2), Noon, Eight)).Should().Throw<ArgumentException>();
    }

    [Fact]
    public void CancelIsIdempotent()
    {
        var shift = WorkSchedule.Create(Guid.NewGuid(), new DateOnly(2026, 11, 2), Eight, Noon);

        shift.Cancel();
        shift.Cancel();

        shift.Status.Should().Be(WorkScheduleStatus.Cancelled);
    }
}
