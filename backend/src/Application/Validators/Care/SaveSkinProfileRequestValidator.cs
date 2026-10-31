using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.UseCases.Care;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Validators.Care;

/// <summary>BR-CARE-01 (skin type required) and BR-CARE-05 (text ≤ 2000).</summary>
public sealed class SaveSkinProfileRequestValidator : AbstractValidator<SaveSkinProfileRequest>
{
    public const int MaxTextLength = 2000;

    public SaveSkinProfileRequestValidator()
    {
        RuleFor(request => request.SkinType)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng chọn loại da.")
            .Must(text => CareEnumText<SkinType>.TryParse(text, out _))
            .WithMessage($"Loại da phải là một trong: {CareEnumText<SkinType>.Names}.");
        RuleFor(request => request.MainConcerns).MaximumLength(MaxTextLength).WithMessage(TooLong("Vấn đề da chính"));
        RuleFor(request => request.CurrentProducts).MaximumLength(MaxTextLength).WithMessage(TooLong("Sản phẩm đang dùng"));
        RuleFor(request => request.CareGoals).MaximumLength(MaxTextLength).WithMessage(TooLong("Mục tiêu chăm sóc"));
        RuleFor(request => request.RecommendedTreatment).MaximumLength(MaxTextLength).WithMessage(TooLong("Đề xuất chăm sóc"));
        RuleFor(request => request.Note).MaximumLength(MaxTextLength).WithMessage(TooLong("Ghi chú"));
    }

    private static string TooLong(string field) => $"{field} tối đa {MaxTextLength} ký tự.";
}
