using FluentAssertions;
using NhuNguyetSpa.Application.Common.Options;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Bookings;

/// <summary>Start-up validation of the <c>Booking</c> section (docs/specs/bookings.md, Q-11, Q-26).</summary>
public sealed class BookingOptionsTests
{
    [Fact]
    public void DefaultsAreValid()
    {
        var options = new BookingOptions();

        BookingOptions.IsValid(options).Should().BeTrue();
        options.AutoAssignStrategy.Should().Be("least_busy");
        options.ReleaseHoldOnPaymentFailure.Should().BeFalse();
    }

    [Theory]
    [InlineData("random")]
    [InlineData("")]
    [InlineData("LEAST_BUSY")]
    public void UnknownStrategyFailsValidation(string strategy)
    {
        BookingOptions.IsValid(new BookingOptions { AutoAssignStrategy = strategy }).Should().BeFalse();
    }

    [Theory]
    [InlineData(-1, false)]
    [InlineData(0, true)]
    [InlineData(168, true)]
    [InlineData(169, false)]
    public void CustomerChangeCutoffMustBeWithinAWeek(int hours, bool valid)
    {
        new BookingOptions().CustomerChangeCutoffHours.Should().Be(24);
        BookingOptions.IsValid(new BookingOptions { CustomerChangeCutoffHours = hours }).Should().Be(valid);
    }

    [Fact]
    public void StepThatDoesNotDivideSixtyFailsValidation()
    {
        BookingOptions.IsValid(new BookingOptions { SlotStepMinutes = 25 }).Should().BeFalse();
    }
}
