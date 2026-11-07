using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Validators.Bookings;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Bookings;

/// <summary>Request rules of UC-SPA-17 (docs/specs/bookings.md E5, BKG-T10).</summary>
public sealed class AppointmentValidatorTests
{
    private static readonly DateOnly Day = new(2026, 11, 2);
    private readonly AppointmentListQueryValidator _list = new(Options.Create(new BookingOptions()));

    [Fact]
    public void ListNeedsBothDatesAndAtMost42Days()
    {
        _list.Validate(new AppointmentListQuery { ToDate = Day }).IsValid.Should().BeFalse();
        _list.Validate(new AppointmentListQuery { FromDate = Day }).IsValid.Should().BeFalse();
        _list.Validate(new AppointmentListQuery { FromDate = Day, ToDate = Day.AddDays(-1) }).IsValid.Should().BeFalse();
        _list.Validate(new AppointmentListQuery { FromDate = Day, ToDate = Day.AddDays(41) }).IsValid.Should().BeTrue();
        _list.Validate(new AppointmentListQuery { FromDate = Day, ToDate = Day.AddDays(42) }).IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData("confirmed", true)]
    [InlineData("no_show", true)]
    [InlineData("Confirmed", false)]
    [InlineData("done", false)]
    public void ListStatusIsSnakeCase(string status, bool valid)
    {
        _list.Validate(new AppointmentListQuery { FromDate = Day, ToDate = Day, Status = status }).IsValid.Should().Be(valid);
    }

    [Fact]
    public void RescheduleNeedsDateAndWholeMinuteTime()
    {
        var validator = new RescheduleAppointmentRequestValidator();

        validator.Validate(new RescheduleAppointmentRequest(Day, new TimeOnly(9, 0))).IsValid.Should().BeTrue();
        validator.Validate(new RescheduleAppointmentRequest(null, new TimeOnly(9, 0))).IsValid.Should().BeFalse();
        validator.Validate(new RescheduleAppointmentRequest(Day, null)).IsValid.Should().BeFalse();
        validator.Validate(new RescheduleAppointmentRequest(Day, new TimeOnly(9, 0, 30))).IsValid.Should().BeFalse();
    }

    [Fact]
    public void AssignNeedsStaff()
    {
        var validator = new AssignAppointmentStaffRequestValidator();

        validator.Validate(new AssignAppointmentStaffRequest(null)).IsValid.Should().BeFalse();
        validator.Validate(new AssignAppointmentStaffRequest(Guid.Empty)).IsValid.Should().BeFalse();
        validator.Validate(new AssignAppointmentStaffRequest(Guid.NewGuid())).IsValid.Should().BeTrue();
    }

    [Fact]
    public void CancelReasonIsRequiredUpTo500()
    {
        var validator = new CancelAppointmentRequestValidator();

        validator.Validate(new CancelAppointmentRequest(null)).IsValid.Should().BeFalse();
        validator.Validate(new CancelAppointmentRequest("   ")).IsValid.Should().BeFalse();
        validator.Validate(new CancelAppointmentRequest(new string('a', 500))).IsValid.Should().BeTrue();
        validator.Validate(new CancelAppointmentRequest(new string('a', 501))).IsValid.Should().BeFalse();
    }

    [Fact]
    public void NoShowNoteIsOptionalUpTo1000()
    {
        var validator = new MarkNoShowRequestValidator();

        validator.Validate(new MarkNoShowRequest(null)).IsValid.Should().BeTrue();
        validator.Validate(new MarkNoShowRequest(new string('a', 1000))).IsValid.Should().BeTrue();
        validator.Validate(new MarkNoShowRequest(new string('a', 1001))).IsValid.Should().BeFalse();
    }
}
