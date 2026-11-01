using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Purchases;

namespace NhuNguyetSpa.Application.Validators.Purchases;

/// <summary>Filters of <c>GET /me/service-history</c> (docs/specs/purchases-treatments.md UC-SPA-20 E1, Q-40).</summary>
public sealed class ServiceHistoryQueryValidator : AbstractValidator<ServiceHistoryQuery>
{
    public static readonly string[] Statuses = ["completed", "no_show"];

    public ServiceHistoryQueryValidator()
    {
        RuleFor(query => query.ToDate)
            .Must((query, to) => query.FromDate is null || to is null || to >= query.FromDate)
            .WithMessage("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
        RuleFor(query => query.Status)
            .Must(status => status is null || Statuses.Contains(status))
            .WithMessage("Trạng thái chỉ nhận completed hoặc no_show.");
    }
}
