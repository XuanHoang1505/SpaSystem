using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Purchases;

namespace NhuNguyetSpa.Application.Validators.Purchases;

/// <summary>Filters of <c>GET /me/purchases</c> (docs/specs/purchases-treatments.md E1): <c>status</c> needs <c>type</c> and fits it.</summary>
public sealed class PurchaseListQueryValidator : AbstractValidator<PurchaseListQuery>
{
    public static readonly IReadOnlyDictionary<string, string[]> StatusesByType = new Dictionary<string, string[]>
    {
        ["service"] = ["available", "booked", "used", "expired"],
        ["package"] = ["active", "completed", "expired", "cancelled"],
    };

    public PurchaseListQueryValidator()
    {
        RuleFor(query => query.Type)
            .Must(type => type is null || StatusesByType.ContainsKey(type))
            .WithMessage("Loại chỉ nhận service hoặc package.");
        RuleFor(query => query.Status)
            .Must((query, status) =>
                status is null || (query.Type is { } type && StatusesByType.TryGetValue(type, out var allowed) && allowed.Contains(status)))
            .WithMessage("Trạng thái cần đi kèm loại và phải đúng với loại đã chọn.");
    }
}
