using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Validators.Staff;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Staff;

/// <summary>UC-SPA-25 query (docs/specs/staff.md BR-STF-10, STF-T33).</summary>
public sealed class AssignedAppointmentQueryValidatorTests
{
    private static readonly DateOnly From = new(2026, 11, 1);
    private readonly AssignedAppointmentQueryValidator _validator = new(Options.Create(new BookingOptions()));

    private bool Valid(DateOnly? from, DateOnly? to, string? status = null) =>
        _validator.Validate(new AssignedAppointmentQuery { FromDate = from, ToDate = to, Status = status }).IsValid;

    [Fact]
    public void MissingDatesInvalid()
    {
        Valid(null, From).Should().BeFalse();
        Valid(From, null).Should().BeFalse();
    }

    [Fact]
    public void ToBeforeFromInvalid() => Valid(From, From.AddDays(-1)).Should().BeFalse();

    [Fact]
    public void Range43DaysInvalid_42Valid()
    {
        Valid(From, From.AddDays(41)).Should().BeTrue();
        Valid(From, From.AddDays(42)).Should().BeFalse();
    }

    [Theory]
    [InlineData("held")]
    [InlineData("hold_expired")]
    [InlineData("abc")]
    [InlineData("Confirmed")]
    public void HeldOrUnknownStatusInvalid(string status) => Valid(From, From, status).Should().BeFalse();

    [Theory]
    [InlineData(null)]
    [InlineData("pending_confirmation")]
    [InlineData("confirmed")]
    [InlineData("completed")]
    [InlineData("cancelled")]
    [InlineData("no_show")]
    public void VisibleStatusesValid(string? status) => Valid(From, From, status).Should().BeTrue();
}
