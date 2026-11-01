using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.UseCases.Bookings;

namespace NhuNguyetSpa.Application.Validators.Bookings;

public sealed class MyAppointmentListQueryValidator : AbstractValidator<MyAppointmentListQuery>
{
    public MyAppointmentListQueryValidator()
    {
        RuleFor(query => query.Scope).Must(scope => MyAppointmentScopes.TryParse(scope, out _)).WithMessage("Nhóm lịch hẹn không hợp lệ.");
        RuleFor(query => query.Status).Must(status => AppointmentStatusText.TryParse(status, out _))
            .WithMessage("Trạng thái lịch hẹn không hợp lệ.");
        RuleFor(query => query.ToDate)
            .Must((query, to) => query.FromDate is null || to is null || query.FromDate <= to)
            .WithMessage("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
    }
}
