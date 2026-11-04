namespace NhuNguyetSpa.Application.UseCases.Promotions;

/// <summary>Promotion codes are compared upper-case and without surrounding spaces (BR-PRM-04).</summary>
public static class PromotionCode
{
    public const string Pattern = "^[A-Z0-9_-]{3,50}$";

    public static string Normalize(string? input)
    {
        return (input ?? string.Empty).Trim().ToUpperInvariant();
    }
}
