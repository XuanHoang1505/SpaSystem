using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Application.UseCases.Treatments;

namespace NhuNguyetSpa.Application.Validators.Treatments;

/// <summary>Filter of <c>GET /me/treatments</c> (docs/specs/purchases-treatments.md UC-SPA-19 E1).</summary>
public sealed class MyTreatmentListQueryValidator : AbstractValidator<MyTreatmentListQuery>
{
    public MyTreatmentListQueryValidator()
    {
        RuleFor(query => query.Status)
            .Must(status => TreatmentStatusText.TryParse(status, out _))
            .WithMessage("Trạng thái liệu trình không hợp lệ.");
    }
}
