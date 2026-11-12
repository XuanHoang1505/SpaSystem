using FluentAssertions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Domain.Tests.Bookings;

/// <summary>State changes of Appointment, ServiceEntitlement and TreatmentSession (docs/specs/bookings.md, BR-BKG-08..10).</summary>
public sealed class AppointmentTransitionTests
{
    private static readonly DateTime Now = new(2026, 10, 28, 3, 0, 0, DateTimeKind.Utc);

    private static Appointment InStatus(AppointmentStatus status) => new()
    {
        Date = new DateOnly(2026, 11, 2),
        StartTime = new TimeOnly(9, 0),
        EndTime = new TimeOnly(10, 0),
        Status = status,
    };

    [Fact]
    public void ConfirmOnlyFromPending()
    {
        var pending = InStatus(AppointmentStatus.PendingConfirmation);
        pending.Confirm();
        pending.Status.Should().Be(AppointmentStatus.Confirmed);

        FluentActions.Invoking(() => InStatus(AppointmentStatus.Confirmed).Confirm()).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void CancelSetsReasonAndTime()
    {
        var appointment = InStatus(AppointmentStatus.Confirmed);

        appointment.Cancel("Khách báo bận", Now);

        appointment.Status.Should().Be(AppointmentStatus.Cancelled);
        appointment.CancellationReason.Should().Be("Khách báo bận");
        appointment.CancelledAtUtc.Should().Be(Now);
    }

    [Fact]
    public void CancelCompletedThrows()
    {
        FluentActions.Invoking(() => InStatus(AppointmentStatus.Completed).Cancel("x", Now)).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void NoShowOnlyFromConfirmed()
    {
        var confirmed = InStatus(AppointmentStatus.Confirmed);
        confirmed.MarkNoShow("Gọi không nghe máy");
        confirmed.Status.Should().Be(AppointmentStatus.NoShow);
        confirmed.Note.Should().Be("Gọi không nghe máy");

        FluentActions.Invoking(() => InStatus(AppointmentStatus.PendingConfirmation).MarkNoShow(null)).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void NoShowNoteIsAppendedToExistingNote()
    {
        var appointment = InStatus(AppointmentStatus.Confirmed);
        appointment.Note = "Khách dặn: da nhạy cảm";

        appointment.MarkNoShow("Gọi không nghe máy");

        appointment.Note.Should().Be("Khách dặn: da nhạy cảm\nGọi không nghe máy");
    }

    [Fact]
    public void NoShowWithoutNoteKeepsExistingNote()
    {
        var appointment = InStatus(AppointmentStatus.Confirmed);
        appointment.Note = "cũ";

        appointment.MarkNoShow(null);

        appointment.Note.Should().Be("cũ");
    }

    [Fact]
    public void RescheduleAndAssignKeepStatus()
    {
        var appointment = InStatus(AppointmentStatus.Confirmed);
        var staffId = Guid.NewGuid();

        appointment.Reschedule(new DateOnly(2026, 11, 3), new TimeOnly(14, 0), new TimeOnly(15, 0));
        appointment.AssignStaff(staffId);

        appointment.Status.Should().Be(AppointmentStatus.Confirmed);
        appointment.Date.Should().Be(new DateOnly(2026, 11, 3));
        appointment.StartTime.Should().Be(new TimeOnly(14, 0));
        appointment.EndTime.Should().Be(new TimeOnly(15, 0));
        appointment.StaffMemberId.Should().Be(staffId);
    }

    [Fact]
    public void RescheduleRejectsEndNotAfterStart()
    {
        FluentActions.Invoking(() => InStatus(AppointmentStatus.Confirmed).Reschedule(new DateOnly(2026, 11, 3), new TimeOnly(10, 0), new TimeOnly(10, 0)))
            .Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData(AppointmentStatus.Held)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    [InlineData(AppointmentStatus.NoShow)]
    [InlineData(AppointmentStatus.HoldExpired)]
    public void OnlyPendingOrConfirmedCanBeManaged(AppointmentStatus status)
    {
        var appointment = InStatus(status);

        appointment.CanBeManaged.Should().BeFalse();
        FluentActions.Invoking(() => appointment.Reschedule(appointment.Date, new TimeOnly(11, 0), new TimeOnly(12, 0))).Should().Throw<InvalidOperationException>();
        FluentActions.Invoking(() => appointment.AssignStaff(Guid.NewGuid())).Should().Throw<InvalidOperationException>();
        FluentActions.Invoking(() => appointment.Cancel("x", Now)).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void ExpireHoldOnlyFromHeld()
    {
        var held = InStatus(AppointmentStatus.Held);
        held.ExpireHold();
        held.Status.Should().Be(AppointmentStatus.HoldExpired);

        FluentActions.Invoking(() => InStatus(AppointmentStatus.Confirmed).ExpireHold()).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void EntitlementReleaseAndConsume()
    {
        var released = new ServiceEntitlement { Status = EntitlementStatus.Booked };
        released.Release();
        released.Status.Should().Be(EntitlementStatus.Available);

        var consumed = new ServiceEntitlement { Status = EntitlementStatus.Booked };
        consumed.Consume();
        consumed.Status.Should().Be(EntitlementStatus.Used);

        var expired = new ServiceEntitlement { Status = EntitlementStatus.Expired };
        expired.Release();
        expired.Status.Should().Be(EntitlementStatus.Expired);
    }

    [Fact]
    public void SessionReleaseAndSkip()
    {
        var released = new TreatmentSession { Status = TreatmentSessionStatus.Booked };
        released.Release();
        released.Status.Should().Be(TreatmentSessionStatus.NotBooked);

        var skipped = new TreatmentSession { Status = TreatmentSessionStatus.Booked };
        skipped.Skip();
        skipped.Status.Should().Be(TreatmentSessionStatus.Skipped);

        var completed = new TreatmentSession { Status = TreatmentSessionStatus.Completed };
        completed.Release();
        completed.Status.Should().Be(TreatmentSessionStatus.Completed);
    }

    [Fact]
    public void ConfirmPaidHoldOnlyFromHeld()
    {
        var entitlementId = Guid.NewGuid();
        var held = InStatus(AppointmentStatus.Held);
        held.ConfirmPaidHold(entitlementId);
        held.Status.Should().Be(AppointmentStatus.Confirmed);
        held.ServiceEntitlementId.Should().Be(entitlementId);

        FluentActions.Invoking(() => InStatus(AppointmentStatus.HoldExpired).ConfirmPaidHold(entitlementId))
            .Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void EntitlementBookOnlyFromAvailable()
    {
        var entitlement = new ServiceEntitlement { Status = EntitlementStatus.Available };
        entitlement.Book();
        entitlement.Status.Should().Be(EntitlementStatus.Booked);

        FluentActions.Invoking(() => new ServiceEntitlement { Status = EntitlementStatus.Used }.Book())
            .Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void SessionBookOnlyFromNotBooked()
    {
        var session = new TreatmentSession { Status = TreatmentSessionStatus.NotBooked };
        session.Book();
        session.Status.Should().Be(TreatmentSessionStatus.Booked);

        FluentActions.Invoking(() => new TreatmentSession { Status = TreatmentSessionStatus.Booked }.Book())
            .Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void ReleaseBookedSourceReleasesEntitlementAndSession()
    {
        var withEntitlement = InStatus(AppointmentStatus.Confirmed);
        withEntitlement.ServiceEntitlement = new ServiceEntitlement { Status = EntitlementStatus.Booked };
        var withSession = InStatus(AppointmentStatus.Confirmed);
        withSession.TreatmentSession = new TreatmentSession { Status = TreatmentSessionStatus.Booked };

        withEntitlement.ReleaseBookedSource();
        withSession.ReleaseBookedSource();
        InStatus(AppointmentStatus.Confirmed).ReleaseBookedSource();

        withEntitlement.ServiceEntitlement.Status.Should().Be(EntitlementStatus.Available);
        withSession.TreatmentSession.Status.Should().Be(TreatmentSessionStatus.NotBooked);
    }

    [Fact]
    public void CancelHoldFromHeldSetsCancelled()
    {
        var held = InStatus(AppointmentStatus.Held);

        held.CancelHold("Hủy đơn hàng DH261101ABCDEF: Đổi ý", Now);

        held.Status.Should().Be(AppointmentStatus.Cancelled);
        held.CancellationReason.Should().Be("Hủy đơn hàng DH261101ABCDEF: Đổi ý");
        held.CancelledAtUtc.Should().Be(Now);
    }

    [Theory]
    [InlineData(AppointmentStatus.HoldExpired)]
    [InlineData(AppointmentStatus.Confirmed)]
    public void CancelHoldFromOtherStatusThrows(AppointmentStatus status)
    {
        FluentActions.Invoking(() => InStatus(status).CancelHold("x", Now)).Should().Throw<InvalidOperationException>();
    }
}
