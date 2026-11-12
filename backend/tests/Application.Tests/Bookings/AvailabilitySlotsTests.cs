using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.Bookings;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Bookings;

/// <summary>The free-slot algorithm A5–A7 as a pure function (docs/specs/bookings.md BR-BKG-12, BKG-T01..T05; step 30').</summary>
public sealed class AvailabilitySlotsTests
{
    private const int Step = 30;

    private static (TimeOnly, TimeOnly) Range(string start, string end) => (TimeOnly.Parse(start), TimeOnly.Parse(end));

    private static string[] Starts(IReadOnlyList<(TimeOnly Start, TimeOnly End)> slots) =>
        slots.Select(slot => slot.Start.ToString("HH:mm")).ToArray();

    [Fact]
    public void Uat01()
    {
        var slots = AvailabilitySlots.Compute([Range("08:00", "12:00")], [Range("09:00", "10:00")], 60, Step, notAfter: null);

        Starts(slots).Should().Equal("08:00", "10:00", "10:30", "11:00");
        slots[0].End.Should().Be(new TimeOnly(9, 0));
    }

    [Fact]
    public void SlotNearShiftEnd()
    {
        var slots = AvailabilitySlots.Compute([Range("08:00", "11:50")], [], 60, Step, notAfter: null);

        Starts(slots).Last().Should().Be("10:30");
        Starts(slots).Should().NotContain("11:00");
    }

    [Fact]
    public void TwoShiftsAndRoundUp()
    {
        var slots = AvailabilitySlots.Compute([Range("13:00", "15:00"), Range("08:10", "10:00")], [], 60, Step, notAfter: null);

        Starts(slots).Should().Equal("08:30", "09:00", "13:00", "13:30", "14:00");
    }

    [Fact]
    public void PastSlotsDropped()
    {
        var slots = AvailabilitySlots.Compute([Range("08:00", "12:00")], [], 60, Step, notAfter: new TimeOnly(9, 20));

        Starts(slots).Should().Equal("09:30", "10:00", "10:30", "11:00");
    }

    [Fact]
    public void SlotStartingExactlyNowIsDropped()
    {
        var slots = AvailabilitySlots.Compute([Range("08:00", "12:00")], [], 60, Step, notAfter: new TimeOnly(9, 0));

        Starts(slots).Should().NotContain("09:00");
    }

    [Fact]
    public void TouchingBusyDoesNotBlock()
    {
        var slots = AvailabilitySlots.Compute([Range("08:00", "10:00")], [Range("09:00", "10:00")], 60, Step, notAfter: null);

        Starts(slots).Should().Equal("08:00");
    }

    [Fact]
    public void BusyStartingOffGridShiftsNextSlotUp()
    {
        var slots = AvailabilitySlots.Compute([Range("08:00", "12:00")], [Range("08:00", "09:10")], 60, Step, notAfter: null);

        Starts(slots).Should().Equal("09:30", "10:00", "10:30", "11:00");
    }

    [Fact]
    public void OverlappingBusyRangesAreMerged()
    {
        var slots = AvailabilitySlots.Compute([Range("08:00", "12:00")], [Range("08:30", "10:00"), Range("09:00", "10:30")], 30, Step, notAfter: null);

        Starts(slots).Should().Equal("08:00", "10:30", "11:00", "11:30");
    }

    [Fact]
    public void NoSlotWhenDurationExceedsSegment()
    {
        AvailabilitySlots.Compute([Range("08:00", "08:45")], [], 60, Step, notAfter: null).Should().BeEmpty();
    }

    [Fact]
    public void NoWrapPastMidnight()
    {
        AvailabilitySlots.Compute([Range("22:00", "23:59")], [], 120, Step, notAfter: null).Should().BeEmpty();
    }
}
