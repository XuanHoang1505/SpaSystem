using FluentValidation;

namespace NhuNguyetSpa.Application.Validators.Catalog;

/// <summary>Shared BR-CAT-02 bounds.</summary>
internal static class CatalogRules
{
    public const decimal MaxPrice = 999_999_999_999m;
    public const int MaxDescriptionLength = 4000;
    public const int MaxNoteLength = 1000;

    /// <summary>Whole VND between 0 and <see cref="MaxPrice"/> (numeric(12,0)).</summary>
    public static IRuleBuilderOptions<T, decimal> VndAmount<T>(this IRuleBuilder<T, decimal> rule) => rule
        .InclusiveBetween(0, MaxPrice).WithMessage("Giá phải từ 0 đến 999.999.999.999 đồng.")
        .Must(price => price == decimal.Truncate(price)).WithMessage("Giá phải là số nguyên (đồng).");

    public static IRuleBuilderOptions<T, decimal?> OptionalVndAmount<T>(this IRuleBuilder<T, decimal?> rule) => rule
        .Must(price => price is null or >= 0 and <= MaxPrice).WithMessage("Giá phải từ 0 đến 999.999.999.999 đồng.")
        .Must(price => price is null || price == decimal.Truncate(price.Value)).WithMessage("Giá phải là số nguyên (đồng).");

    public static IRuleBuilderOptions<T, string> RequiredText<T>(this IRuleBuilder<T, string> rule, int maxLength, string label) => rule
        .Must(value => !string.IsNullOrWhiteSpace(value)).WithMessage($"Vui lòng nhập {label}.")
        .MaximumLength(maxLength).WithMessage($"{char.ToUpperInvariant(label[0])}{label[1..]} tối đa {maxLength} ký tự.");
}
