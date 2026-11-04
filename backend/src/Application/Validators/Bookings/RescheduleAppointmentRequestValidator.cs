using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.Validators.Bookings;

public sealed class RescheduleAppointmentRequestValidator : AbstractValidator<RescheduleAppointmentRequest>
{
    public RescheduleAppointmentRequestValidator()
    {
        RuleFor(request => request.Date).NotNull().WithMessage("Vui lòng chọn ngày mới.");
        RuleFor(request => request.StartTime)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Vui lòng chọn giờ bắt đầu mới.")
            .Must(time => time!.Value.Second == 0 && time.Value.Millisecond == 0).WithMessage("Giờ chỉ gồm giờ và phút (HH:mm).");
    }
}
