using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Validators.Users;

public sealed class UserFilterValidator : AbstractValidator<UserFilter>
{
    public UserFilterValidator()
    {
        RuleFor(filter => filter.Role).Must(role => UserQuery.TryParse<UserRole>(role, out _))
            .WithMessage("Vai trò phải là customer, staff hoặc owner.");
        RuleFor(filter => filter.Status).Must(status => UserQuery.TryParse<UserStatus>(status, out _))
            .WithMessage("Trạng thái phải là active, locked hoặc inactive.");
    }
}
