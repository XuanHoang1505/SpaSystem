using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.WorkSchedules;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.WorkSchedules;

/// <summary>BR-STF-07: which appointments occupy a staff member's time.</summary>
public sealed class AppointmentOccupancyTests
{
    private static readonly DateTime Now = new(2026, 10, 27, 3, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData(AppointmentStatus.PendingConfirmation, true)]
    [InlineData(AppointmentStatus.Confirmed, true)]
    [InlineData(AppointmentStatus.Completed, false)]
    [InlineData(AppointmentStatus.Cancelled, false)]
    [InlineData(AppointmentStatus.NoShow, false)]
    [InlineData(AppointmentStatus.HoldExpired, false)]
    public void OccupyingStatuses(AppointmentStatus status, bool occupying) =>
        IsOccupying(new Appointment { Status = status }).Should().Be(occupying);

    [Fact]
    public void HeldOccupiesOnlyUntilTheHoldExpires()
    {
        IsOccupying(new Appointment { Status = AppointmentStatus.Held, HoldExpiresAtUtc = Now.AddMinutes(1) }).Should().BeTrue();
        IsOccupying(new Appointment { Status = AppointmentStatus.Held, HoldExpiresAtUtc = Now }).Should().BeFalse();
        IsOccupying(new Appointment { Status = AppointmentStatus.Held, HoldExpiresAtUtc = null }).Should().BeFalse();
    }

    [Theory]
    [InlineData(8, 12, 12, 17, false)]
    [InlineData(12, 17, 8, 12, false)]
    [InlineData(8, 12, 11, 13, true)]
    [InlineData(8, 12, 9, 10, true)]
    [InlineData(9, 10, 8, 12, true)]
    public void Overlaps(int aStart, int aEnd, int bStart, int bEnd, bool expected) =>
        AppointmentOccupancy.Overlaps(new TimeOnly(aStart, 0), new TimeOnly(aEnd, 0), new TimeOnly(bStart, 0), new TimeOnly(bEnd, 0))
            .Should().Be(expected);

    private static bool IsOccupying(Appointment appointment) => AppointmentOccupancy.IsOccupying(Now).Compile()(appointment);
}
