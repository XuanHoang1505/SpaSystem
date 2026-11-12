using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.Validators.Bookings;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Bookings;

/// <summary>Body rules of <c>POST /me/appointments/book-now</c> and <c>POST /me/appointments</c> (docs/specs/bookings.md E1, BKG-T32, T45).</summary>
public sealed class BookingRequestValidatorTests
{
    private static readonly DateOnly Today = StaffTestDoubles.VietnamToday;
    private readonly BookNowRequestValidator _bookNow = new(StaffTestDoubles.Clock(), Options.Create(new BookingOptions()));
    private readonly BookAppointmentRequestValidator _book = new(StaffTestDoubles.Clock(), Options.Create(new BookingOptions()));

    private static BookNowRequest BookNow(DateOnly? date = null, TimeOnly? start = null, string? promotionCode = null) =>
        new(Guid.NewGuid(), date ?? Today.AddDays(1), start ?? new TimeOnly(9, 0), null, promotionCode);

    [Theory]
    [InlineData("abc", null, false)]
    [InlineData("upcoming,cancelled", null, false)]
    [InlineData("past,cancelled", null, false)]
    [InlineData(null, "abc", false)]
    [InlineData("Upcoming", "confirmed", true)]
    [InlineData("cancelled", null, true)]
    [InlineData(null, null, true)]
    public void MyListScopeAndStatusMustBeKnown(string? scope, string? status, bool valid)
    {
        var result = new MyAppointmentListQueryValidator().Validate(new MyAppointmentListQuery { Scope = scope, Status = status });

        result.IsValid.Should().Be(valid);
        if (scope is not null && scope != "Upcoming" && scope != "cancelled")
            result.Errors.Single().ErrorMessage.Should().Be("Nhóm lịch hẹn không hợp lệ.");
        if (status == "abc")
            result.Errors.Single().ErrorMessage.Should().Be("Trạng thái lịch hẹn không hợp lệ.");
    }

    [Fact]
    public void MyRescheduleNeedsDateAndGridTime()
    {
        var validator = new RescheduleMyAppointmentRequestValidator(StaffTestDoubles.Clock(), Options.Create(new BookingOptions()));

        validator.Validate(new RescheduleMyAppointmentRequest(Today.AddDays(1), new TimeOnly(9, 30), null)).IsValid.Should().BeTrue();
        validator.Validate(new RescheduleMyAppointmentRequest(null, null, null)).Errors.Select(error => error.PropertyName)
            .Should().BeEquivalentTo(["Date", "StartTime"]);
        validator.Validate(new RescheduleMyAppointmentRequest(Today.AddDays(1), new TimeOnly(9, 15), null)).IsValid.Should().BeFalse();
        validator.Validate(new RescheduleMyAppointmentRequest(Today.AddDays(61), new TimeOnly(9, 0), null)).IsValid.Should().BeFalse();
    }

    [Fact]
    public void MyListFromDateAfterToDateFails()
    {
        var result = new MyAppointmentListQueryValidator().Validate(new MyAppointmentListQuery { FromDate = Today.AddDays(2), ToDate = Today });

        result.Errors.Single().ErrorMessage.Should().Be("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
        new MyAppointmentListQueryValidator().Validate(new MyAppointmentListQuery { FromDate = Today, ToDate = Today }).IsValid.Should().BeTrue();
    }

    [Fact]
    public void ValidBookNowPasses()
    {
        _bookNow.Validate(BookNow()).IsValid.Should().BeTrue();
        _bookNow.Validate(BookNow(Today.AddDays(60), new TimeOnly(9, 30))).IsValid.Should().BeTrue();
    }

    [Fact]
    public void MissingFieldsFail()
    {
        _bookNow.Validate(new BookNowRequest(null, null, null, null, null)).Errors.Select(error => error.PropertyName)
            .Should().BeEquivalentTo(["SpaServiceId", "Date", "StartTime"]);
    }

    [Theory]
    [InlineData(9, 15, 0)]
    [InlineData(9, 0, 30)]
    public void OffGridOrSecondsFail(int hour, int minute, int second)
    {
        _bookNow.Validate(BookNow(start: new TimeOnly(hour, minute, second))).IsValid.Should().BeFalse();
    }

    [Fact]
    public void DateOutsideRangeFails()
    {
        _bookNow.Validate(BookNow(Today.AddDays(-1))).IsValid.Should().BeFalse();
        _bookNow.Validate(BookNow(Today.AddDays(61))).IsValid.Should().BeFalse();
    }

    [Fact]
    public void LongPromotionCodeFails()
    {
        _bookNow.Validate(BookNow(promotionCode: new string('A', 51))).IsValid.Should().BeFalse();
    }

    [Fact]
    public void FlowTwoNeedsExactlyOneSource()
    {
        var date = Today.AddDays(1);
        var start = new TimeOnly(9, 0);

        _book.Validate(new BookAppointmentRequest(Guid.NewGuid(), null, date, start, null)).IsValid.Should().BeTrue();
        _book.Validate(new BookAppointmentRequest(null, Guid.NewGuid(), date, start, null)).IsValid.Should().BeTrue();
        _book.Validate(new BookAppointmentRequest(Guid.NewGuid(), Guid.NewGuid(), date, start, null)).IsValid.Should().BeFalse();
        _book.Validate(new BookAppointmentRequest(null, null, date, start, null)).IsValid.Should().BeFalse();
        _book.Validate(new BookAppointmentRequest(Guid.NewGuid(), null, date, new TimeOnly(9, 15), null)).IsValid.Should().BeFalse();
    }
}
