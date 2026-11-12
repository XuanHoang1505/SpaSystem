using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.UseCases.Bookings;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Bookings;

/// <summary>BR-BKG-14 "any staff" with the least_busy strategy (Q-26).</summary>
public sealed class StaffPickerTests
{
    private static readonly Guid IdA = Guid.Parse("00000000-0000-0000-0000-00000000000a");
    private static readonly Guid IdB = Guid.Parse("00000000-0000-0000-0000-00000000000b");

    [Fact]
    public void FewestOccupyingWins()
    {
        var picked = StaffPicker.PickLeastBusy([(new AvailabilityCandidate(IdA, "An"), 2), (new AvailabilityCandidate(IdB, "Bình"), 0)]);

        picked!.StaffMemberId.Should().Be(IdB);
    }

    [Fact]
    public void TieByName()
    {
        var picked = StaffPicker.PickLeastBusy([(new AvailabilityCandidate(IdA, "Chi"), 1), (new AvailabilityCandidate(IdB, "Bình"), 1)]);

        picked!.FullName.Should().Be("Bình");
    }

    [Fact]
    public void TieByIdWhenNamesEqual()
    {
        var picked = StaffPicker.PickLeastBusy([(new AvailabilityCandidate(IdB, "Lan"), 1), (new AvailabilityCandidate(IdA, "Lan"), 1)]);

        picked!.StaffMemberId.Should().Be(IdA);
    }

    [Fact]
    public void EmptyIsNull()
    {
        StaffPicker.PickLeastBusy([]).Should().BeNull();
    }
}
