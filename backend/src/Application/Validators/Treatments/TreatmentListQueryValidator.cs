using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Application.UseCases.Treatments;

namespace NhuNguyetSpa.Application.Validators.Treatments;

/// <summary>Filters of <c>GET /treatments</c> (docs/specs/purchases-treatments.md UC-SPA-21); <c>search</c> is checked by <c>PagedQueryValidator</c>.</summary>
public sealed class TreatmentListQueryValidator : AbstractValidator<TreatmentListQuery>
{
    public TreatmentListQueryValidator()
    {
        RuleFor(query => query.Status)
            .Must(status => TreatmentStatusText.TryParse(status, out _))
            .WithMessage("Trạng thái liệu trình không hợp lệ.");
    }
}
