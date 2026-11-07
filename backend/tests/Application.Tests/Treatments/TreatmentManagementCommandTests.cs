using FluentAssertions;
using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Application.UseCases.Treatments;
using NhuNguyetSpa.Application.Validators.Treatments;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Treatments;

/// <summary>UC-SPA-21 commands (docs/specs/purchases-treatments.md BR-TRT-07…09, Q-38; TRT-T24…T29).</summary>
public sealed class TreatmentManagementCommandTests
{
    private readonly TreatmentTestBed _bed = new();

    private static UpdateTreatmentPlanRequest Details(DateOnly? expectedEnd = null) => new("  Giảm mụn viêm ", expectedEnd, "   ");

    private TreatmentSession TrackedSession(TreatmentSessionStatus status, Guid? planId = null)
    {
        var session = new TreatmentSession { Id = Guid.NewGuid(), TreatmentPlanId = planId ?? _bed.Plan.Id, Status = status, Note = "cũ" };
        _bed.Purchases.GetSessionForUpdateAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        // The re-read after saving returns the session, as the database would.
        _bed.SessionRows.Add(new TreatmentSessionRow(session.Id, session.TreatmentPlanId, Guid.NewGuid(), 1, "Buổi 1", 60, status, null, null));
        return session;
    }

    private static async Task ShouldFail<TException>(Func<Task> action, string code) where TException : DomainException =>
        await FluentActions.Awaiting(action).Should().ThrowAsync<TException>().Where(error => error.Code == code);

    [Fact]
    public async Task StaffNotInChargeIsForbiddenToEdit()
    {
        var staff = _bed.UseRole("staff");
        _bed.Treatments.IsAssignedToPlanAsync(_bed.Plan.Id, staff, Arg.Any<CancellationToken>()).Returns(true);

        await ShouldFail<ForbiddenException>(() => _bed.Create().UpdateAsync(_bed.Plan.Id, Details(), default),
            TreatmentErrors.TreatmentNotInChargeCode);
        await _bed.UnitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task OwnerAndPrimaryStaffEdit()
    {
        await _bed.Create().UpdateAsync(_bed.Plan.Id, Details(TreatmentTestBed.Today.AddDays(30)), default);
        _bed.PlanEntity.Goal.Should().Be("Giảm mụn viêm");
        _bed.PlanEntity.Note.Should().BeNull();
        _bed.PlanEntity.ExpectedEndDate.Should().Be(TreatmentTestBed.Today.AddDays(30));

        _bed.UsePrimaryStaff();
        await _bed.Create().UpdateAsync(_bed.Plan.Id, new UpdateTreatmentPlanRequest("Mới", null, "Ghi chú"), default);
        _bed.PlanEntity.Goal.Should().Be("Mới");
        await _bed.UnitOfWork.Received(2).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExpectedEndDateBeforeStartIsInvalid()
    {
        await FluentActions.Awaiting(() => _bed.Create().UpdateAsync(_bed.Plan.Id, Details(TreatmentTestBed.Today.AddDays(-21)), default))
            .Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ExpectedEndDateWithoutStartDateIsAccepted()
    {
        _bed.PlanEntity.StartDate = null;

        await _bed.Create().UpdateAsync(_bed.Plan.Id, Details(TreatmentTestBed.Today.AddDays(-30)), default);

        _bed.PlanEntity.ExpectedEndDate.Should().Be(TreatmentTestBed.Today.AddDays(-30));
    }

    [Theory]
    [InlineData(TreatmentPlanStatus.Completed)]
    [InlineData(TreatmentPlanStatus.Cancelled)]
    public async Task EditTerminalPlanIsStatusInvalid(TreatmentPlanStatus status)
    {
        _bed.PlanStatus(status);

        await ShouldFail<ConflictException>(() => _bed.Create().UpdateAsync(_bed.Plan.Id, Details(), default), TreatmentErrors.TreatmentStatusInvalidCode);
    }

    [Theory]
    [InlineData(TreatmentSessionStatus.Completed)]
    [InlineData(TreatmentSessionStatus.Skipped)]
    public async Task StaffEditsCompletedSessionNoteIsConflict(TreatmentSessionStatus status)
    {
        _bed.UsePrimaryStaff();
        var session = TrackedSession(status);

        await ShouldFail<ConflictException>(() => _bed.Create().UpdateSessionAsync(_bed.Plan.Id, session.Id, new UpdateTreatmentSessionRequest("x"), default),
            TreatmentErrors.TreatmentSessionCompletedCode);
    }

    [Fact]
    public async Task PrimaryStaffEditsOpenSessionNote()
    {
        _bed.UsePrimaryStaff();
        var session = TrackedSession(TreatmentSessionStatus.NotBooked);

        await _bed.Create().UpdateSessionAsync(_bed.Plan.Id, session.Id, new UpdateTreatmentSessionRequest(" Dặn trước "), default);

        session.Note.Should().Be("Dặn trước");
    }

    [Fact]
    public async Task OwnerEditsCompletedSessionNote()
    {
        _bed.PlanStatus(TreatmentPlanStatus.Completed);
        var session = TrackedSession(TreatmentSessionStatus.Completed);

        await _bed.Create().UpdateSessionAsync(_bed.Plan.Id, session.Id, new UpdateTreatmentSessionRequest("Sửa kết quả"), default);

        session.Note.Should().Be("Sửa kết quả");
    }

    [Fact]
    public async Task SessionOfOtherPlanNotFound()
    {
        var session = TrackedSession(TreatmentSessionStatus.NotBooked, planId: Guid.NewGuid());

        await ShouldFail<NotFoundException>(() => _bed.Create().UpdateSessionAsync(_bed.Plan.Id, session.Id, new UpdateTreatmentSessionRequest("x"), default),
            BookingErrors.TreatmentSessionNotFoundCode);
    }

    [Fact]
    public async Task CancelledPlanSessionNoteIsStatusInvalid()
    {
        _bed.PlanStatus(TreatmentPlanStatus.Cancelled);
        var session = TrackedSession(TreatmentSessionStatus.NotBooked);

        await ShouldFail<ConflictException>(() => _bed.Create().UpdateSessionAsync(_bed.Plan.Id, session.Id, new UpdateTreatmentSessionRequest("x"), default),
            TreatmentErrors.TreatmentStatusInvalidCode);
    }

    [Fact]
    public async Task StaffCallingOwnerCommandIsForbidden()
    {
        _bed.UsePrimaryStaff();
        var service = _bed.Create();
        var reason = new TreatmentReasonRequest("Lý do");

        await ShouldFail<ForbiddenException>(() => service.PauseAsync(_bed.Plan.Id, reason, default), TreatmentErrors.ForbiddenCode);
        await ShouldFail<ForbiddenException>(() => service.ResumeAsync(_bed.Plan.Id, default), TreatmentErrors.ForbiddenCode);
        await ShouldFail<ForbiddenException>(() => service.CancelAsync(_bed.Plan.Id, reason, default), TreatmentErrors.ForbiddenCode);
        await ShouldFail<ForbiddenException>(() => service.CompleteAsync(_bed.Plan.Id, default), TreatmentErrors.ForbiddenCode);
        await ShouldFail<ForbiddenException>(() => service.AssignStaffAsync(_bed.Plan.Id, new AssignTreatmentStaffRequest(null), default),
            TreatmentErrors.ForbiddenCode);
    }

    [Fact]
    public async Task AssignResignedStaffIsBadRequest()
    {
        var staff = new StaffMember { Id = Guid.NewGuid() };
        staff.Resign(TreatmentTestBed.Today);
        _bed.StaffMembers.GetForUpdateAsync(staff.Id, Arg.Any<CancellationToken>()).Returns(staff);

        await ShouldFail<BusinessRuleException>(() => _bed.Create().AssignStaffAsync(_bed.Plan.Id, new AssignTreatmentStaffRequest(staff.Id), default),
            TreatmentErrors.StaffResignedCode);
    }

    [Fact]
    public async Task AssignUnknownStaffNotFound()
    {
        await ShouldFail<NotFoundException>(() => _bed.Create().AssignStaffAsync(_bed.Plan.Id, new AssignTreatmentStaffRequest(Guid.NewGuid()), default),
            "staff_not_found");
    }

    [Fact]
    public async Task AssignWorkingStaffAndNullClearsPrimary()
    {
        var staff = new StaffMember { Id = Guid.NewGuid() };
        staff.Resign(TreatmentTestBed.Today.AddDays(1));
        _bed.StaffMembers.GetForUpdateAsync(staff.Id, Arg.Any<CancellationToken>()).Returns(staff);
        var service = _bed.Create();

        await service.AssignStaffAsync(_bed.Plan.Id, new AssignTreatmentStaffRequest(staff.Id), default);
        _bed.PlanEntity.PrimaryStaffMemberId.Should().Be(staff.Id);

        await service.AssignStaffAsync(_bed.Plan.Id, new AssignTreatmentStaffRequest(null), default);
        _bed.PlanEntity.PrimaryStaffMemberId.Should().BeNull();
    }

    [Fact]
    public async Task PauseLocksCustomerThenPackage()
    {
        await _bed.Create().PauseAsync(_bed.Plan.Id, new TreatmentReasonRequest("  Khách đi công tác  "), default);

        Received.InOrder(() =>
        {
            _bed.Appointments.LockCustomerForBookingAsync(_bed.Plan.Customer.Id, Arg.Any<CancellationToken>());
            _bed.Purchases.GetPackageForUpdateAsync(_bed.Plan.Id, Arg.Any<CancellationToken>());
        });
        _bed.PlanEntity.Status.Should().Be(TreatmentPlanStatus.Paused);
        _bed.PlanEntity.StatusReason.Should().Be("Khách đi công tác");
    }

    [Fact]
    public async Task PausePausedIsStatusInvalid()
    {
        _bed.PlanStatus(TreatmentPlanStatus.Paused);

        await ShouldFail<ConflictException>(() => _bed.Create().PauseAsync(_bed.Plan.Id, new TreatmentReasonRequest("x"), default),
            TreatmentErrors.TreatmentStatusInvalidCode);
    }

    [Fact]
    public async Task ResumeUsesUsedSessions()
    {
        _bed.PlanStatus(TreatmentPlanStatus.Paused);
        _bed.PackageEntity.UsedSessions = 0;

        await _bed.Create().ResumeAsync(_bed.Plan.Id, default);

        _bed.PlanEntity.Status.Should().Be(TreatmentPlanStatus.NotStarted);
    }

    [Fact]
    public async Task ResumeAfterAutoCompleteIsConflict()
    {
        _bed.PlanStatus(TreatmentPlanStatus.Completed);

        await ShouldFail<ConflictException>(() => _bed.Create().ResumeAsync(_bed.Plan.Id, default), TreatmentErrors.TreatmentStatusInvalidCode);
    }

    [Fact]
    public async Task CancelWithBookedSessionsIsConflict()
    {
        _bed.Treatments.HasBookedSessionsAsync(_bed.Plan.Id, Arg.Any<CancellationToken>()).Returns(true);

        await ShouldFail<ConflictException>(() => _bed.Create().CancelAsync(_bed.Plan.Id, new TreatmentReasonRequest("x"), default),
            TreatmentErrors.TreatmentHasBookedSessionsCode);
        _bed.PlanEntity.Status.Should().Be(TreatmentPlanStatus.InProgress);
    }

    [Fact]
    public async Task CancelCancelsPackage()
    {
        await _bed.Create().CancelAsync(_bed.Plan.Id, new TreatmentReasonRequest("Khách chuyển nơi ở"), default);

        _bed.PlanEntity.Status.Should().Be(TreatmentPlanStatus.Cancelled);
        _bed.PackageEntity.Status.Should().Be(CustomerPackageStatus.Cancelled);
        await _bed.Appointments.Received(1).LockCustomerForBookingAsync(_bed.Plan.Customer.Id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CompleteWithOpenSessionsIsConflict()
    {
        _bed.Treatments.HasOpenSessionsAsync(_bed.Plan.Id, Arg.Any<CancellationToken>()).Returns(true);

        await ShouldFail<ConflictException>(() => _bed.Create().CompleteAsync(_bed.Plan.Id, default), TreatmentErrors.TreatmentSessionsRemainingCode);
    }

    [Fact]
    public async Task CompleteFromNotStartedIsStatusInvalid()
    {
        _bed.PlanStatus(TreatmentPlanStatus.NotStarted);

        await ShouldFail<ConflictException>(() => _bed.Create().CompleteAsync(_bed.Plan.Id, default), TreatmentErrors.TreatmentStatusInvalidCode);
    }

    [Fact]
    public async Task CompleteUsesLatestVisitDateOrToday()
    {
        var lastVisit = TreatmentTestBed.Today.AddDays(-3);
        _bed.Treatments.LatestCompletedVisitDateAsync(_bed.Plan.Id, Arg.Any<CancellationToken>()).Returns(lastVisit);

        await _bed.Create().CompleteAsync(_bed.Plan.Id, default);

        _bed.PlanEntity.ActualEndDate.Should().Be(lastVisit);
        _bed.PackageEntity.Status.Should().Be(CustomerPackageStatus.Completed);

        var other = new TreatmentTestBed();
        await other.Create().CompleteAsync(other.Plan.Id, default);
        other.PlanEntity.ActualEndDate.Should().Be(TreatmentTestBed.Today);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void ReasonBlankInvalid(string? reason) =>
        new TreatmentReasonRequestValidator().Validate(new TreatmentReasonRequest(reason)).IsValid.Should().BeFalse();

    [Fact]
    public void ReasonOver500Invalid()
    {
        var validator = new TreatmentReasonRequestValidator();
        validator.Validate(new TreatmentReasonRequest(new string('a', 501))).IsValid.Should().BeFalse();
        validator.Validate(new TreatmentReasonRequest(new string('a', 500))).IsValid.Should().BeTrue();
    }

    [Fact]
    public void GoalOver2000Invalid()
    {
        new UpdateTreatmentPlanRequestValidator().Validate(new UpdateTreatmentPlanRequest(new string('a', 2001), null, null)).IsValid.Should().BeFalse();
        new UpdateTreatmentSessionRequestValidator().Validate(new UpdateTreatmentSessionRequest(new string('a', 2001))).IsValid.Should().BeFalse();
    }
}
