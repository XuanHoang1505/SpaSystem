using FluentValidation;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;

namespace NhuNguyetSpa.Application.Validators.WorkSchedules;

public sealed class UpdateWorkScheduleRequestValidator : AbstractValidator<UpdateWorkScheduleRequest>
{
    public UpdateWorkScheduleRequestValidator()
    {
        RuleFor(request => request.Date).NotNull().WithMessage("Vui lòng chọn ngày làm việc.");
        RuleFor(request => request.StartTime).ShiftTime("giờ bắt đầu");
        RuleFor(request => request.EndTime).ShiftTime("giờ kết thúc")
            .Must((request, end) => ShiftRules.EndsAfterStart(request.StartTime, end)).WithMessage(ShiftRules.EndAfterStartMessage);
    }
}
