using FluentValidation;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;

namespace NhuNguyetSpa.Application.Validators.WorkSchedules;

/// <summary>A cancelled shift is final (WF-12), so the only accepted value is <c>cancelled</c>.</summary>
public sealed class ChangeWorkScheduleStatusRequestValidator : AbstractValidator<ChangeWorkScheduleStatusRequest>
{
    public ChangeWorkScheduleStatusRequestValidator() => RuleFor(request => request.Status)
        .Must(status => string.Equals(status?.Trim(), "cancelled", StringComparison.OrdinalIgnoreCase))
        .WithMessage("Chỉ hủy được ca (status = cancelled); ca đã hủy không mở lại được.");
}
