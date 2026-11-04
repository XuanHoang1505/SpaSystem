using FluentAssertions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Domain.Tests.Care;

/// <summary>Completing a visit (UC-SPA-28, BR-TRT-02, BR-TRT-03) and the care records of UC-SPA-27 (docs/specs/care.md).</summary>
public sealed class CareTransitionTests
{
    private static readonly DateTime Now = new(2026, 10, 31, 3, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly VisitDate = new(2026, 10, 31);

    private static Appointment InStatus(AppointmentStatus status, string? note = null) => new()
    {
        Date = VisitDate,
        StartTime = new TimeOnly(9, 0),
        EndTime = new TimeOnly(10, 0),
        Status = status,
        Note = note,
    };

    private static CustomerPackage Package(int used, int total, CustomerPackageStatus status = CustomerPackageStatus.Active) =>
        new() { UsedSessions = used, TotalSessions = total, Status = status, PackageName = "Gói" };

    [Fact]
    public void CompleteOnlyFromConfirmed()
    {
        var appointment = InStatus(AppointmentStatus.Confirmed);
        appointment.Complete(null);
        appointment.Status.Should().Be(AppointmentStatus.Completed);

        foreach (var status in new[]
                 {
                     AppointmentStatus.Held, AppointmentStatus.PendingConfirmation, AppointmentStatus.Completed,
                     AppointmentStatus.Cancelled, AppointmentStatus.NoShow, AppointmentStatus.HoldExpired,
                 })
            FluentActions.Invoking(() => InStatus(status).Complete(null)).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void CompleteAppendsNote()
    {
        var empty = InStatus(AppointmentStatus.Confirmed);
        empty.Complete("Da đáp ứng tốt");
        empty.Note.Should().Be("Da đáp ứng tốt");

        var withNote = InStatus(AppointmentStatus.Confirmed, "Khách đến sớm");
        withNote.Complete("Da đáp ứng tốt");
        withNote.Note.Should().Be("Khách đến sớm\nDa đáp ứng tốt");

        var keep = InStatus(AppointmentStatus.Confirmed, "Khách đến sớm");
        keep.Complete(null);
        keep.Note.Should().Be("Khách đến sớm");
    }

    [Fact]
    public void MarkUsedOnlyFromBooked()
    {
        var booked = new ServiceEntitlement { Status = EntitlementStatus.Booked };
        booked.MarkUsed();
        booked.Status.Should().Be(EntitlementStatus.Used);

        foreach (var status in new[] { EntitlementStatus.Available, EntitlementStatus.Used, EntitlementStatus.Expired })
            FluentActions.Invoking(() => new ServiceEntitlement { Status = status }.MarkUsed()).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void SessionCompleteSetsNoteAndTime()
    {
        var session = new TreatmentSession { Status = TreatmentSessionStatus.Booked };
        session.Complete("Giảm mụn rõ", Now);

        session.Status.Should().Be(TreatmentSessionStatus.Completed);
        session.Note.Should().Be("Giảm mụn rõ");
        session.CompletedAtUtc.Should().Be(Now);

        foreach (var status in new[] { TreatmentSessionStatus.NotBooked, TreatmentSessionStatus.Completed, TreatmentSessionStatus.Skipped })
            FluentActions.Invoking(() => new TreatmentSession { Status = status }.Complete(null, Now)).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void RecordCompletedSessionCompletesAtTotal()
    {
        var package = Package(1, 3);
        package.RecordCompletedSession().Should().BeFalse();
        package.UsedSessions.Should().Be(2);
        package.Status.Should().Be(CustomerPackageStatus.Active);

        package.RecordCompletedSession().Should().BeTrue();
        package.UsedSessions.Should().Be(3);
        package.Status.Should().Be(CustomerPackageStatus.Completed);
    }

    [Fact]
    public void ExpiredPackageStillRecordsCompletion()
    {
        var package = Package(0, 2, CustomerPackageStatus.Expired);
        package.RecordCompletedSession().Should().BeFalse();
        package.UsedSessions.Should().Be(1);
    }

    [Fact]
    public void RecordCompletedSessionNeverExceedsTotal()
    {
        FluentActions.Invoking(() => Package(3, 3).RecordCompletedSession()).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void CancelledPackageRejectsCompletion()
    {
        FluentActions.Invoking(() => Package(0, 3, CustomerPackageStatus.Cancelled).RecordCompletedSession())
            .Should().Throw<InvalidOperationException>();
        FluentActions.Invoking(() => Package(0, 3, CustomerPackageStatus.Completed).RecordCompletedSession())
            .Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void PlanStartsOnFirstAndEndsWithPackage()
    {
        var plan = new TreatmentPlan { Status = TreatmentPlanStatus.NotStarted };
        plan.RecordCompletedSession(VisitDate, packageCompleted: false);
        plan.Status.Should().Be(TreatmentPlanStatus.InProgress);
        plan.StartDate.Should().Be(VisitDate);

        var later = VisitDate.AddDays(14);
        plan.RecordCompletedSession(later, packageCompleted: true);
        plan.Status.Should().Be(TreatmentPlanStatus.Completed);
        plan.StartDate.Should().Be(VisitDate);
        plan.ActualEndDate.Should().Be(later);
    }

    [Fact]
    public void SingleSessionPackageStartsAndEndsSameDay()
    {
        var plan = new TreatmentPlan { Status = TreatmentPlanStatus.NotStarted };
        plan.RecordCompletedSession(VisitDate, packageCompleted: true);
        plan.Status.Should().Be(TreatmentPlanStatus.Completed);
        plan.StartDate.Should().Be(VisitDate);
        plan.ActualEndDate.Should().Be(VisitDate);
    }

    [Fact]
    public void PausedPlanStaysPausedUntilPackageCompletes()
    {
        var plan = new TreatmentPlan { Status = TreatmentPlanStatus.Paused, StartDate = VisitDate.AddDays(-7) };
        plan.RecordCompletedSession(VisitDate, packageCompleted: false);
        plan.Status.Should().Be(TreatmentPlanStatus.Paused);

        plan.RecordCompletedSession(VisitDate, packageCompleted: true);
        plan.Status.Should().Be(TreatmentPlanStatus.Completed);
        plan.ActualEndDate.Should().Be(VisitDate);
    }

    [Fact]
    public void CancelledPlanRejectsCompletion()
    {
        FluentActions.Invoking(() => new TreatmentPlan { Status = TreatmentPlanStatus.Cancelled }.RecordCompletedSession(VisitDate, false))
            .Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void SkinProfileRecordSetsFields()
    {
        var profile = new SkinProfile();
        profile.Record(SkinType.Oily, "Mụn ẩn", "Sữa rửa mặt", "Giảm dầu", "Liệu trình 5 buổi", "Ghi chú");

        profile.SkinType.Should().Be(SkinType.Oily);
        profile.MainConcerns.Should().Be("Mụn ẩn");
        profile.CurrentProducts.Should().Be("Sữa rửa mặt");
        profile.CareGoals.Should().Be("Giảm dầu");
        profile.RecommendedTreatment.Should().Be("Liệu trình 5 buổi");
        profile.Note.Should().Be("Ghi chú");
    }

    [Fact]
    public void AllergyChangeUpdatesFieldsAndTime()
    {
        var allergy = new CustomerAllergy { Allergen = "Cũ", Severity = AllergySeverity.Mild, RecordedAtUtc = Now.AddDays(-3) };
        allergy.Change("Paraben", AllergySeverity.Severe, "Nổi mẩn", Now);

        allergy.Allergen.Should().Be("Paraben");
        allergy.Severity.Should().Be(AllergySeverity.Severe);
        allergy.Note.Should().Be("Nổi mẩn");
        allergy.RecordedAtUtc.Should().Be(Now);
    }
}
