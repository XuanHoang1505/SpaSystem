using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.Care;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Care;

/// <summary>BR-CARE-03 and BR-CARE-04 as pure functions (docs/specs/care.md).</summary>
public sealed class CareRulesTests
{
    private static readonly DateOnly Today = new(2026, 10, 31);

    [Fact]
    public void ConfirmedTodayOrEarlierIsWritable()
    {
        FluentActions.Invoking(() => CareRules.EnsureSkinProfileWritable(AppointmentStatus.Confirmed, Today, Today, 7)).Should().NotThrow();
        FluentActions.Invoking(() => CareRules.EnsureSkinProfileWritable(AppointmentStatus.Confirmed, Today.AddDays(-2), Today, 7))
            .Should().NotThrow();
    }

    [Fact]
    public void ConfirmedTomorrowIsTooEarly()
    {
        FluentActions.Invoking(() => CareRules.EnsureSkinProfileWritable(AppointmentStatus.Confirmed, Today.AddDays(1), Today, 7))
            .Should().Throw<BusinessRuleException>().Which.Code.Should().Be(CareErrors.SkinProfileTooEarlyCode);
    }

    [Fact]
    public void CompletedOnDay7Writable_Day8Locked()
    {
        FluentActions.Invoking(() => CareRules.EnsureSkinProfileWritable(AppointmentStatus.Completed, Today.AddDays(-7), Today, 7))
            .Should().NotThrow();
        var locked = FluentActions.Invoking(() => CareRules.EnsureSkinProfileWritable(AppointmentStatus.Completed, Today.AddDays(-8), Today, 7))
            .Should().Throw<ConflictException>().Which;
        locked.Code.Should().Be(CareErrors.SkinProfileLockedCode);
        locked.Message.Should().Be("Hồ sơ da chỉ sửa được trong 7 ngày sau buổi chăm sóc.");
    }

    [Theory]
    [InlineData(AppointmentStatus.Cancelled)]
    [InlineData(AppointmentStatus.NoShow)]
    [InlineData(AppointmentStatus.Held)]
    [InlineData(AppointmentStatus.HoldExpired)]
    [InlineData(AppointmentStatus.PendingConfirmation)]
    public void OtherStatusesAreStatusInvalid(AppointmentStatus status)
    {
        FluentActions.Invoking(() => CareRules.EnsureSkinProfileWritable(status, Today, Today, 7))
            .Should().Throw<ConflictException>().Which.Code.Should().Be("appointment_status_invalid");
    }

    [Theory]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    [InlineData(AppointmentStatus.PendingConfirmation)]
    public void CompleteNeedsConfirmed(AppointmentStatus status)
    {
        FluentActions.Invoking(() => CareRules.EnsureCompletable(status, Today, new TimeOnly(9, 0), At(10, 0)))
            .Should().Throw<ConflictException>().Which.Code.Should().Be("appointment_status_invalid");
    }

    [Fact]
    public void CompleteOneMinuteBeforeStartIsTooEarly()
    {
        FluentActions.Invoking(() => CareRules.EnsureCompletable(AppointmentStatus.Confirmed, Today, new TimeOnly(9, 0), At(8, 59)))
            .Should().Throw<BusinessRuleException>().Which.Code.Should().Be(CareErrors.CompleteTooEarlyCode);
    }

    [Fact]
    public void CompleteAtStartIsAllowed()
    {
        FluentActions.Invoking(() => CareRules.EnsureCompletable(AppointmentStatus.Confirmed, Today, new TimeOnly(9, 0), At(9, 0)))
            .Should().NotThrow();
    }

    [Fact]
    public void CompleteAcrossMidnightIsAllowed()
    {
        // 16:40Z on 31/10 = 23:40 VN on 31/10; an appointment at 23:30 on 31/10 has started.
        var now = new DateTime(2026, 10, 31, 16, 40, 0, DateTimeKind.Utc);
        FluentActions.Invoking(() => CareRules.EnsureCompletable(AppointmentStatus.Confirmed, Today, new TimeOnly(23, 30), now))
            .Should().NotThrow();
        // 17:10Z = 00:10 VN on 01/11: the 31/10 23:30 appointment is still completable the next day.
        FluentActions.Invoking(() => CareRules.EnsureCompletable(AppointmentStatus.Confirmed, Today, new TimeOnly(23, 30), now.AddMinutes(30)))
            .Should().NotThrow();
    }

    /// <summary>UTC instant of <paramref name="hour"/>:<paramref name="minute"/> on <see cref="Today"/> in Vietnam (UTC+7).</summary>
    private static DateTime At(int hour, int minute) =>
        new DateTime(Today.Year, Today.Month, Today.Day, hour, minute, 0, DateTimeKind.Utc).AddHours(-7);
}
