using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Bookings;

/// <summary>BR-BKG-05, BR-BKG-15 and Q-30 as pure functions (docs/specs/bookings.md).</summary>
public sealed class EntitlementEligibilityTests
{
    // 10:00 on 30/10/2026 in Vietnam.
    private static readonly DateTime Now = new(2026, 10, 30, 3, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly Today = new(2026, 10, 30);

    private static SessionBookingFacts Facts(
        int sequence = 2,
        TreatmentSessionStatus status = TreatmentSessionStatus.NotBooked,
        CustomerPackageStatus packageStatus = CustomerPackageStatus.Active,
        DateTime? expiresAtUtc = null,
        TreatmentPlanStatus planStatus = TreatmentPlanStatus.InProgress,
        bool earlierDone = true,
        PreviousVisit? previous = null,
        int minDays = 7,
        NextVisit? next = null) =>
        new(Guid.NewGuid(), Guid.NewGuid(), 60, sequence, status, packageStatus, expiresAtUtc ?? Now.AddDays(90), planStatus, earlierDone,
            previous, minDays, next);

    [Fact]
    public void ServiceReasons()
    {
        EntitlementEligibility.ForService(EntitlementStatus.Available, null, Now).Should().BeNull();
        EntitlementEligibility.ForService(EntitlementStatus.Booked, null, Now).Should().Be("Dịch vụ này đã được đặt lịch.");
        EntitlementEligibility.ForService(EntitlementStatus.Used, null, Now).Should().Be("Dịch vụ này đã được sử dụng.");
        EntitlementEligibility.ForService(EntitlementStatus.Available, Now.AddMinutes(-1), Now).Should().Be("Dịch vụ đã hết hạn sử dụng.");
        EntitlementEligibility.ForService(EntitlementStatus.Expired, null, Now).Should().Be("Dịch vụ đã hết hạn sử dụng.");
    }

    [Fact]
    public void SessionReasonsInOrder()
    {
        EntitlementEligibility.ForSession(Facts(status: TreatmentSessionStatus.Booked), Now).Reason
            .Should().Be("Buổi này đã được đặt lịch hoặc đã hoàn thành.");
        EntitlementEligibility.ForSession(Facts(expiresAtUtc: Now.AddDays(-1)), Now).Reason
            .Should().Be("Gói đã hết hạn hoặc không còn sử dụng.");
        EntitlementEligibility.ForSession(Facts(packageStatus: CustomerPackageStatus.Cancelled), Now).Reason
            .Should().Be("Gói đã hết hạn hoặc không còn sử dụng.");
        EntitlementEligibility.ForSession(Facts(planStatus: TreatmentPlanStatus.Paused), Now).Reason
            .Should().Be("Liệu trình đang tạm dừng hoặc đã hủy.");
        EntitlementEligibility.ForSession(Facts(earlierDone: false), Now).Reason
            .Should().Be("Cần đặt lịch các buổi trước theo thứ tự.");
        EntitlementEligibility.ForSession(Facts(), Now).CanBook.Should().BeTrue();
    }

    [Fact]
    public void EarliestDateUsesPreviousPlusMinDays()
    {
        var facts = Facts(previous: new PreviousVisit(new DateOnly(2026, 10, 29), new TimeOnly(10, 0)), minDays: 7);

        EntitlementEligibility.ForSession(facts, Now).EarliestDate.Should().Be(new DateOnly(2026, 11, 5));
    }

    [Fact]
    public void FirstSessionHasNoMinimum()
    {
        EntitlementEligibility.ForSession(Facts(sequence: 1), Now).EarliestDate.Should().Be(Today);
    }

    [Fact]
    public void EarliestDateIsNeverBeforeToday()
    {
        var facts = Facts(previous: new PreviousVisit(new DateOnly(2026, 9, 1), new TimeOnly(10, 0)), minDays: 7);

        EntitlementEligibility.ForSession(facts, Now).EarliestDate.Should().Be(Today);
    }

    [Fact]
    public void CancelledPreviousSessionBlocksNext()
    {
        var eligibility = EntitlementEligibility.ForSession(Facts(earlierDone: false, previous: null), Now);

        eligibility.CanBook.Should().BeFalse();
    }

    [Fact]
    public void BeforeEarliestDateIsTooEarly()
    {
        var facts = Facts(previous: new PreviousVisit(new DateOnly(2026, 10, 29), new TimeOnly(10, 0)), minDays: 7);

        FluentActions.Invoking(() => EntitlementEligibility.EnsureSessionSlot(facts, new DateOnly(2026, 11, 4), new TimeOnly(9, 0), Now))
            .Should().Throw<BusinessRuleException>()
            .Where(error => error.Code == "session_too_early" && error.Message.Contains("05/11/2026"));
        FluentActions.Invoking(() => EntitlementEligibility.EnsureSessionSlot(facts, new DateOnly(2026, 11, 5), new TimeOnly(9, 0), Now))
            .Should().NotThrow();
    }

    [Fact]
    public void SameDayBeforePreviousEndIsTooEarly()
    {
        var facts = Facts(previous: new PreviousVisit(new DateOnly(2026, 11, 2), new TimeOnly(10, 0)), minDays: 0);

        FluentActions.Invoking(() => EntitlementEligibility.EnsureSessionSlot(facts, new DateOnly(2026, 11, 2), new TimeOnly(9, 30), Now))
            .Should().Throw<BusinessRuleException>().Where(error => error.Code == "session_too_early");
        FluentActions.Invoking(() => EntitlementEligibility.EnsureSessionSlot(facts, new DateOnly(2026, 11, 2), new TimeOnly(10, 0), Now))
            .Should().NotThrow();
    }

    [Fact]
    public void StartAtOrAfterPackageExpiryIsNotEligible()
    {
        // Package expires 09:00 VN on 10/11 (02:00 UTC).
        var facts = Facts(sequence: 1, expiresAtUtc: new DateTime(2026, 11, 10, 2, 0, 0, DateTimeKind.Utc));

        FluentActions.Invoking(() => EntitlementEligibility.EnsureSessionSlot(facts, new DateOnly(2026, 11, 10), new TimeOnly(9, 0), Now))
            .Should().Throw<ConflictException>().Where(error => error.Code == "entitlement_not_eligible");
        FluentActions.Invoking(() => EntitlementEligibility.EnsureSessionSlot(facts, new DateOnly(2026, 11, 10), new TimeOnly(8, 30), Now))
            .Should().NotThrow();
    }

    [Fact]
    public void IneligibleSessionThrowsWithReason()
    {
        FluentActions.Invoking(() =>
                EntitlementEligibility.EnsureSessionSlot(Facts(earlierDone: false), Today.AddDays(1), new TimeOnly(9, 0), Now))
            .Should().Throw<ConflictException>().WithMessage("Cần đặt lịch các buổi trước theo thứ tự.");
    }

    [Fact]
    public void SlotTooSoonAcrossMidnight()
    {
        // Hold ends 00:10 on 31/10 VN (17:10 UTC on 30/10).
        var holdEnd = new DateTime(2026, 10, 30, 17, 10, 0, DateTimeKind.Utc);

        FluentActions.Invoking(() => EntitlementEligibility.EnsureBookNowStart(new DateOnly(2026, 10, 31), new TimeOnly(0, 0), holdEnd))
            .Should().Throw<BusinessRuleException>().Where(error => error.Code == "slot_too_soon");
        FluentActions.Invoking(() => EntitlementEligibility.EnsureBookNowStart(new DateOnly(2026, 10, 31), new TimeOnly(0, 30), holdEnd))
            .Should().NotThrow();
    }

    // BR-BKG-16 / Q-42: session 2 of a package; session 1 visited on D 09:00–10:00, session 3 booked on D+20 09:00 (gap 7).
    private static readonly DateOnly D = Today.AddDays(1);

    private static SessionBookingFacts Middle(int nextGap = 7, DateTime? expiresAtUtc = null, TreatmentPlanStatus planStatus = TreatmentPlanStatus.InProgress) =>
        Facts(status: TreatmentSessionStatus.Booked, previous: new PreviousVisit(D, new TimeOnly(10, 0)), minDays: 7,
            next: new NextVisit(D.AddDays(20), new TimeOnly(9, 0), nextGap), expiresAtUtc: expiresAtUtc ?? Now.AddDays(40),
            planStatus: planStatus);

    private static Action Reschedule(SessionBookingFacts facts, DateOnly date, int startHour, int startMinute = 0, int minutes = 60)
    {
        var start = new TimeOnly(startHour, startMinute);
        return () => EntitlementEligibility.EnsureSessionReschedule(facts, date, start, start.AddMinutes(minutes), Now);
    }

    [Fact]
    public void RescheduleBeforeEarliestIsTooEarly() =>
        Reschedule(Middle(), D.AddDays(3), 9).Should().Throw<BusinessRuleException>().Which.Code.Should().Be("session_too_early");

    [Fact]
    public void RescheduleOnEarliestAndLatestIsAllowed()
    {
        Reschedule(Middle(), D.AddDays(7), 9).Should().NotThrow();
        Reschedule(Middle(), D.AddDays(13), 9).Should().NotThrow();
    }

    [Fact]
    public void RescheduleAfterLatestIsTooLate() =>
        Reschedule(Middle(), D.AddDays(14), 9).Should().Throw<BusinessRuleException>()
            .Where(error => error.Code == "session_too_late" && error.Message.Contains(D.AddDays(13).ToString("dd/MM/yyyy")));

    [Fact]
    public void SameDayAsNextVisitMustEndBeforeItStarts()
    {
        Reschedule(Middle(nextGap: 0), D.AddDays(20), 8).Should().NotThrow();
        Reschedule(Middle(nextGap: 0), D.AddDays(20), 8, 30).Should().Throw<BusinessRuleException>().Which.Code.Should().Be("session_too_late");
    }

    [Fact]
    public void RescheduleWhenPlanPausedIsNotEligible() =>
        Reschedule(Middle(planStatus: TreatmentPlanStatus.Paused), D.AddDays(8), 9)
            .Should().Throw<ConflictException>().Which.Code.Should().Be("entitlement_not_eligible");

    [Fact]
    public void RescheduleAfterPackageExpiryIsNotEligible() =>
        Reschedule(Middle(nextGap: 0, expiresAtUtc: Now.AddDays(10)), D.AddDays(12), 9)
            .Should().Throw<ConflictException>().Which.Code.Should().Be("entitlement_not_eligible");

    [Fact]
    public void BookedSessionCanBeRescheduled() => Reschedule(Middle(), D.AddDays(9), 9).Should().NotThrow();

    [Fact]
    public void WindowWithoutNextHasNoLatest()
    {
        EntitlementEligibility.RescheduleWindow(Facts(previous: new PreviousVisit(D, new TimeOnly(10, 0))), Now)
            .Should().Be(new SessionWindow(D.AddDays(7), null));
        EntitlementEligibility.RescheduleWindow(Middle(), Now).Should().Be(new SessionWindow(D.AddDays(7), D.AddDays(13)));
    }
}
