using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Validators.Users;

/// <summary>BR-AUTH-18: only active ↔ locked; inactive belongs to staff resignation (UC-SPA-22).</summary>
public sealed class ChangeUserStatusRequestValidator : AbstractValidator<ChangeUserStatusRequest>
{
    public ChangeUserStatusRequestValidator() => RuleFor(request => request.Status).Cascade(CascadeMode.Stop)
        .NotNull().WithMessage("Vui lòng chọn trạng thái.")
        .Must(status => status is UserStatus.Active or UserStatus.Locked).WithMessage("Chỉ được khóa hoặc mở khóa tài khoản.");
}
