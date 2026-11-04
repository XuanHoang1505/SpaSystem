using FluentValidation;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;

namespace NhuNguyetSpa.Application.Validators.Bookings;

/// <summary>Date and start-time rules shared by the two customer booking bodies (UC-SPA-15 E1).</summary>
internal static class BookingSlotRules
{
    public static void Date<T>(IRuleBuilderInitial<T, DateOnly?> rule, IDateTimeProvider clock, BookingOptions options) =>
        rule.Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Vui lòng chọn ngày.")
            .Must(date => date!.Value >= SpaTime.Today(clock.UtcNow) && date.Value <= SpaTime.Today(clock.UtcNow).AddDays(options.MaxDaysAhead))
            .WithMessage($"Chỉ đặt lịch từ hôm nay đến {options.MaxDaysAhead} ngày tới.");

    public static void StartTime<T>(IRuleBuilderInitial<T, TimeOnly?> rule, BookingOptions options) =>
        rule.Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Vui lòng chọn giờ bắt đầu.")
            .Must(time => time!.Value.Second == 0 && time.Value.Millisecond == 0).WithMessage("Giờ chỉ gồm giờ và phút (HH:mm).")
            .Must(time => (time!.Value.Hour * 60 + time.Value.Minute) % options.SlotStepMinutes == 0)
            .WithMessage($"Giờ bắt đầu phải theo bước {options.SlotStepMinutes} phút.");
}
