using FluentAssertions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Domain.Tests.Treatments;

/// <summary>Owner/staff changes to a treatment plan and its package (UC-SPA-21, BR-TRT-07, BR-TRT-08; docs/specs/purchases-treatments.md).</summary>
public sealed class TreatmentPlanTransitionTests
{
    private static readonly DateOnly EndDate = new(2026, 10, 31);

    private static TreatmentPlan Plan(TreatmentPlanStatus status, string? reason = null) => new() { Status = status, StatusReason = reason };

    private static CustomerPackage Package(CustomerPackageStatus status) =>
        new() { Status = status, TotalSessions = 3, UsedSessions = 2, PackageName = "Gói" };

    [Theory]
    [InlineData(TreatmentPlanStatus.NotStarted)]
    [InlineData(TreatmentPlanStatus.InProgress)]
    public void PauseFromNotStartedAndInProgressStoresReason(TreatmentPlanStatus status)
    {
        var plan = Plan(status);
        plan.Pause("Khách đang điều trị da liễu");
        plan.Status.Should().Be(TreatmentPlanStatus.Paused);
        plan.StatusReason.Should().Be("Khách đang điều trị da liễu");
    }

    [Theory]
    [InlineData(TreatmentPlanStatus.Paused)]
    [InlineData(TreatmentPlanStatus.Completed)]
    [InlineData(TreatmentPlanStatus.Cancelled)]
    public void PauseFromPausedCompletedCancelledThrows(TreatmentPlanStatus status) =>
        FluentActions.Invoking(() => Plan(status).Pause("x")).Should().Throw<InvalidOperationException>();

    [Theory]
    [InlineData(TreatmentPlanStatus.NotStarted)]
    [InlineData(TreatmentPlanStatus.InProgress)]
    [InlineData(TreatmentPlanStatus.Completed)]
    [InlineData(TreatmentPlanStatus.Cancelled)]
    public void ResumeOnlyFromPaused(TreatmentPlanStatus status) =>
        FluentActions.Invoking(() => Plan(status).Resume(1)).Should().Throw<InvalidOperationException>();

    [Fact]
    public void ResumeWithoutUsedSessionsGoesToNotStarted()
    {
        var notStarted = Plan(TreatmentPlanStatus.Paused, "x");
        notStarted.Resume(0);
        notStarted.Status.Should().Be(TreatmentPlanStatus.NotStarted);

        var inProgress = Plan(TreatmentPlanStatus.Paused, "x");
        inProgress.Resume(2);
        inProgress.Status.Should().Be(TreatmentPlanStatus.InProgress);
    }

    [Fact]
    public void ResumeClearsReason()
    {
        var plan = Plan(TreatmentPlanStatus.Paused, "Tạm dừng");
        plan.Resume(1);
        plan.StatusReason.Should().BeNull();
    }

    [Theory]
    [InlineData(TreatmentPlanStatus.NotStarted)]
    [InlineData(TreatmentPlanStatus.InProgress)]
    [InlineData(TreatmentPlanStatus.Paused)]
    public void CancelFromAnyOpenStatus(TreatmentPlanStatus status)
    {
        var plan = Plan(status);
        plan.Cancel("Khách chuyển nơi ở");
        plan.Status.Should().Be(TreatmentPlanStatus.Cancelled);
        plan.StatusReason.Should().Be("Khách chuyển nơi ở");
    }

    [Theory]
    [InlineData(TreatmentPlanStatus.Completed)]
    [InlineData(TreatmentPlanStatus.Cancelled)]
    public void CancelCompletedThrows(TreatmentPlanStatus status) =>
        FluentActions.Invoking(() => Plan(status).Cancel("x")).Should().Throw<InvalidOperationException>();

    [Theory]
    [InlineData(TreatmentPlanStatus.InProgress)]
    [InlineData(TreatmentPlanStatus.Paused)]
    public void CloseFromInProgressAndPausedSetsEndDate(TreatmentPlanStatus status)
    {
        var plan = Plan(status, "x");
        plan.Close(EndDate);
        plan.Status.Should().Be(TreatmentPlanStatus.Completed);
        plan.ActualEndDate.Should().Be(EndDate);
        plan.StatusReason.Should().BeNull();
    }

    [Theory]
    [InlineData(TreatmentPlanStatus.NotStarted)]
    [InlineData(TreatmentPlanStatus.Completed)]
    [InlineData(TreatmentPlanStatus.Cancelled)]
    public void CloseFromNotStartedThrows(TreatmentPlanStatus status) =>
        FluentActions.Invoking(() => Plan(status).Close(EndDate)).Should().Throw<InvalidOperationException>();

    [Theory]
    [InlineData(TreatmentPlanStatus.Completed)]
    [InlineData(TreatmentPlanStatus.Cancelled)]
    public void UpdateDetailsOnTerminalPlanThrows(TreatmentPlanStatus status)
    {
        FluentActions.Invoking(() => Plan(status).UpdateDetails("Mục tiêu", EndDate, null)).Should().Throw<InvalidOperationException>();
        FluentActions.Invoking(() => Plan(status).AssignPrimaryStaff(Guid.NewGuid())).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void UpdateDetailsAndAssignOnOpenPlan()
    {
        var staffId = Guid.NewGuid();
        var plan = Plan(TreatmentPlanStatus.Paused);
        plan.UpdateDetails("Giảm mụn", EndDate, "Ghi chú");
        plan.AssignPrimaryStaff(staffId);
        plan.Goal.Should().Be("Giảm mụn");
        plan.ExpectedEndDate.Should().Be(EndDate);
        plan.Note.Should().Be("Ghi chú");
        plan.PrimaryStaffMemberId.Should().Be(staffId);
        plan.AssignPrimaryStaff(null);
        plan.PrimaryStaffMemberId.Should().BeNull();
    }

    [Theory]
    [InlineData(CustomerPackageStatus.Active)]
    [InlineData(CustomerPackageStatus.Expired)]
    public void PackageCancelAndCloseFromActiveOrExpired(CustomerPackageStatus status)
    {
        var cancelled = Package(status);
        cancelled.Cancel();
        cancelled.Status.Should().Be(CustomerPackageStatus.Cancelled);

        var closed = Package(status);
        closed.Close();
        closed.Status.Should().Be(CustomerPackageStatus.Completed);
        closed.UsedSessions.Should().Be(2);
    }

    [Theory]
    [InlineData(CustomerPackageStatus.Completed)]
    [InlineData(CustomerPackageStatus.Cancelled)]
    public void PackageCancelTwiceThrows(CustomerPackageStatus status)
    {
        FluentActions.Invoking(() => Package(status).Cancel()).Should().Throw<InvalidOperationException>();
        FluentActions.Invoking(() => Package(status).Close()).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void SessionChangeNoteSetsNote()
    {
        var session = new TreatmentSession { Status = TreatmentSessionStatus.Completed, Note = "cũ" };
        session.ChangeNote("mới");
        session.Note.Should().Be("mới");
    }
}
