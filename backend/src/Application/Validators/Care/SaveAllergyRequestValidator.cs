using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.UseCases.Care;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Validators.Care;

/// <summary>BR-CARE-05: allergen 1–255 characters after trimming, a known severity, note ≤ 1000.</summary>
public sealed class SaveAllergyRequestValidator : AbstractValidator<SaveAllergyRequest>
{
    public const int MaxAllergenLength = 255;
    public const int MaxNoteLength = 1000;

    public SaveAllergyRequestValidator()
    {
        RuleFor(request => request.Allergen)
            .Cascade(CascadeMode.Stop)
            .Must(text => !string.IsNullOrWhiteSpace(text)).WithMessage("Vui lòng nhập tác nhân gây dị ứng.")
            .Must(text => text!.Trim().Length <= MaxAllergenLength).WithMessage($"Tác nhân gây dị ứng tối đa {MaxAllergenLength} ký tự.");
        RuleFor(request => request.Severity)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng chọn mức độ dị ứng.")
            .Must(text => CareEnumText<AllergySeverity>.TryParse(text, out _))
            .WithMessage($"Mức độ dị ứng phải là một trong: {CareEnumText<AllergySeverity>.Names}.");
        RuleFor(request => request.Note).MaximumLength(MaxNoteLength).WithMessage($"Ghi chú tối đa {MaxNoteLength} ký tự.");
    }
}
