using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Validators.Staff;

/// <summary>BR-STF-10: range like <c>GET /appointments</c>; held and hold-expired appointments are never shown to staff (Q-33).</summary>
public sealed class AssignedAppointmentQueryValidator : AbstractValidator<AssignedAppointmentQuery>
{
    public AssignedAppointmentQueryValidator(IOptions<BookingOptions> options)
    {
        var maxDays = options.Value.MaxQueryRangeDays;
        RuleFor(query => query.FromDate).NotNull().WithMessage("Vui lòng chọn ngày bắt đầu.");
        RuleFor(query => query.ToDate)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Vui lòng chọn ngày kết thúc.")
            .Must((query, to) => query.FromDate is null || to >= query.FromDate).WithMessage("Ngày kết thúc phải từ ngày bắt đầu trở đi.")
            .Must((query, to) => query.FromDate is null || to!.Value.DayNumber - query.FromDate.Value.DayNumber + 1 <= maxDays)
            .WithMessage($"Chỉ xem tối đa {maxDays} ngày một lần.");
        RuleFor(query => query.Status)
            .Must(text => AppointmentStatusText.TryParse(text, out var status) &&
                          status is not (AppointmentStatus.Held or AppointmentStatus.HoldExpired))
            .WithMessage("Trạng thái lịch hẹn không hợp lệ.");
    }
}
