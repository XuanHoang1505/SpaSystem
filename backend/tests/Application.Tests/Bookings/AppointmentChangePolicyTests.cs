using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Bookings;

/// <summary>BR-BKG-07: a customer changes an appointment only while it is pending/confirmed and at least N hours ahead (Q-04).</summary>
public sealed class AppointmentChangePolicyTests
{
    private static readonly DateOnly VisitDate = new(2026, 11, 5);
    private static readonly TimeOnly VisitStart = new(10, 0);

    // Vietnam is UTC+7: 09:00 VN on 04/11 = 02:00Z.
    private static DateTime Vn(int day, int hour, int minute = 0) => new DateTime(2026, 11, day, hour, minute, 0, DateTimeKind.Utc).AddHours(-7);

    private static bool CanChange(DateTime nowUtc, int cutoff = 24, AppointmentStatus status = AppointmentStatus.Confirmed) =>
        AppointmentChangePolicy.CanChange(status, VisitDate, VisitStart, nowUtc, cutoff);

    [Fact]
    public void ConfirmedWithTwentyFiveHoursLeftCanChange() => CanChange(Vn(4, 9)).Should().BeTrue();

    [Fact]
    public void CutoffBoundaryIsInclusive()
    {
        CanChange(Vn(4, 10)).Should().BeTrue();
        CanChange(Vn(4, 10, 1)).Should().BeFalse();
    }

    [Fact]
    public void CutoffUsesVietnamTime()
    {
        CanChange(new DateTime(2026, 11, 4, 2, 59, 0, DateTimeKind.Utc)).Should().BeTrue();
        CanChange(new DateTime(2026, 11, 4, 3, 1, 0, DateTimeKind.Utc)).Should().BeFalse();
    }

    [Fact]
    public void ZeroCutoffAllowsUntilStart()
    {
        CanChange(Vn(5, 9, 59), cutoff: 0).Should().BeTrue();
        CanChange(Vn(5, 10), cutoff: 0).Should().BeFalse();
    }

    [Theory]
    [InlineData(AppointmentStatus.Held, false)]
    [InlineData(AppointmentStatus.PendingConfirmation, true)]
    [InlineData(AppointmentStatus.Confirmed, true)]
    [InlineData(AppointmentStatus.Completed, false)]
    [InlineData(AppointmentStatus.Cancelled, false)]
    [InlineData(AppointmentStatus.NoShow, false)]
    [InlineData(AppointmentStatus.HoldExpired, false)]
    public void OnlyPendingAndConfirmedCanChange(AppointmentStatus status, bool expected) =>
        CanChange(Vn(4, 9), status: status).Should().Be(expected);

    [Fact]
    public void EnsureChecksStatusBeforeWindow()
    {
        FluentActions.Invoking(() => AppointmentChangePolicy.EnsureCanChange(AppointmentStatus.Completed, VisitDate, VisitStart, Vn(5, 9), 24))
            .Should().Throw<ConflictException>().Which.Code.Should().Be("appointment_status_invalid");
        FluentActions.Invoking(() => AppointmentChangePolicy.EnsureCanChange(AppointmentStatus.Confirmed, VisitDate, VisitStart, Vn(4, 11), 24))
            .Should().Throw<BusinessRuleException>()
            .Where(error => error.Code == "change_window_passed" && error.Message.Contains("24 giờ"));
        FluentActions.Invoking(() => AppointmentChangePolicy.EnsureCanChange(AppointmentStatus.Confirmed, VisitDate, VisitStart, Vn(4, 9), 24))
            .Should().NotThrow();
    }

    [Fact]
    public void DeadlineIsStartMinusCutoffInUtc()
    {
        AppointmentChangePolicy.DeadlineUtc(AppointmentStatus.Confirmed, VisitDate, VisitStart, 24)
            .Should().Be(new DateTime(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc));
        AppointmentChangePolicy.DeadlineUtc(AppointmentStatus.Held, VisitDate, VisitStart, 24).Should().BeNull();
    }

    [Fact]
    public void PausedPlanBlocksRescheduleOnly()
    {
        var now = Vn(4, 9);
        AppointmentChangeFacts Facts(TreatmentPlanStatus? plan = null, CustomerPackageStatus? package = null, DateTime? packageExpires = null,
            DateTime? entitlementExpires = null) =>
            new(AppointmentStatus.Confirmed, VisitDate, VisitStart, plan, package, packageExpires, entitlementExpires);

        AppointmentChangePolicy.SourceAllowsReschedule(Facts(), now).Should().BeTrue();
        AppointmentChangePolicy.SourceAllowsReschedule(Facts(TreatmentPlanStatus.InProgress, CustomerPackageStatus.Active, now.AddDays(30)), now)
            .Should().BeTrue();
        AppointmentChangePolicy.SourceAllowsReschedule(Facts(TreatmentPlanStatus.Paused, CustomerPackageStatus.Active, now.AddDays(30)), now)
            .Should().BeFalse();
        AppointmentChangePolicy.SourceAllowsReschedule(Facts(TreatmentPlanStatus.InProgress, CustomerPackageStatus.Active, now.AddDays(-1)), now)
            .Should().BeFalse();
        AppointmentChangePolicy.SourceAllowsReschedule(Facts(entitlementExpires: now.AddMinutes(-1)), now).Should().BeFalse();
    }
}
