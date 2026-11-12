using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Care;

namespace NhuNguyetSpa.Application.Validators.Care;

/// <summary>BR-CARE-07: both dates optional, inclusive and ordered.</summary>
public sealed class CareHistoryQueryValidator : AbstractValidator<CareHistoryQuery>
{
    public CareHistoryQueryValidator()
    {
        RuleFor(query => query.ToDate)
            .Must((query, to) => query.FromDate is null || to is null || to >= query.FromDate)
            .WithMessage("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
    }
}
