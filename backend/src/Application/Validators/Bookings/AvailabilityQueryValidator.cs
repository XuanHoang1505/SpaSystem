using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.Validators.Bookings;

public sealed class AvailabilityQueryValidator : AbstractValidator<AvailabilityQuery>
{
    public AvailabilityQueryValidator(IDateTimeProvider clock, IOptions<BookingOptions> options)
    {
        var maxDays = options.Value.MaxDaysAhead;
        RuleFor(query => query.SpaServiceId).NotNull().WithMessage("Vui lòng chọn dịch vụ.");
        RuleFor(query => query.Date)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Vui lòng chọn ngày.")
            .Must(date => InRange(date!.Value, SpaTime.Today(clock.UtcNow), maxDays))
            .WithMessage($"Chỉ xem giờ trống từ hôm nay đến {maxDays} ngày tới.");
    }

    private static bool InRange(DateOnly date, DateOnly today, int maxDays) => date >= today && date <= today.AddDays(maxDays);
}
