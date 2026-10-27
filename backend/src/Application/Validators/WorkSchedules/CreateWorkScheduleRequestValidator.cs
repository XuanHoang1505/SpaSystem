using FluentValidation;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;

namespace NhuNguyetSpa.Application.Validators.WorkSchedules;

/// <summary>Date window, hire and resignation dates need the clock and the staff member, so the service checks them (BR-STF-06).</summary>
public sealed class CreateWorkScheduleRequestValidator : AbstractValidator<CreateWorkScheduleRequest>
{
    public CreateWorkScheduleRequestValidator()
    {
        RuleFor(request => request.StaffMemberId).NotNull().WithMessage("Vui lòng chọn nhân viên.");
        RuleFor(request => request.Date).NotNull().WithMessage("Vui lòng chọn ngày làm việc.");
        RuleFor(request => request.StartTime).ShiftTime("giờ bắt đầu");
        RuleFor(request => request.EndTime).ShiftTime("giờ kết thúc")
            .Must((request, end) => ShiftRules.EndsAfterStart(request.StartTime, end)).WithMessage(ShiftRules.EndAfterStartMessage);
    }
}
