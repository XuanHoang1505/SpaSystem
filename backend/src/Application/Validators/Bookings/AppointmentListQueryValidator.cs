using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.UseCases.Bookings;

namespace NhuNguyetSpa.Application.Validators.Bookings;

public sealed class AppointmentListQueryValidator : AbstractValidator<AppointmentListQuery>
{
    public AppointmentListQueryValidator(IOptions<BookingOptions> options)
    {
        var maxDays = options.Value.MaxQueryRangeDays;
        RuleFor(query => query.FromDate).NotNull().WithMessage("Vui lòng chọn ngày bắt đầu.");
        RuleFor(query => query.ToDate)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Vui lòng chọn ngày kết thúc.")
            .Must((query, to) => query.FromDate is null || to >= query.FromDate).WithMessage("Ngày kết thúc phải từ ngày bắt đầu trở đi.")
            .Must((query, to) => query.FromDate is null || to!.Value.DayNumber - query.FromDate.Value.DayNumber + 1 <= maxDays)
            .WithMessage($"Chỉ xem tối đa {maxDays} ngày một lần.");
        RuleFor(query => query.Status).Must(status => AppointmentStatusText.TryParse(status, out _))
            .WithMessage("Trạng thái lịch hẹn không hợp lệ.");
    }
}
