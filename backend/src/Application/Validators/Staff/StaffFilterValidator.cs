using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Staff;

namespace NhuNguyetSpa.Application.Validators.Staff;

public sealed class StaffFilterValidator : AbstractValidator<StaffFilter>
{
    public StaffFilterValidator()
    {
        RuleFor(filter => filter.Status)
            .Must(status => StaffQuery.TryParseStatus(status, out _))
            .WithMessage("Trạng thái phải là working hoặc resigned.");
        RuleFor(filter => filter.View)
            .Must(view => view is null || string.Equals(view, StaffFilter.PublicView, StringComparison.OrdinalIgnoreCase))
            .WithMessage("Chế độ xem chỉ nhận giá trị public.");
    }
}
