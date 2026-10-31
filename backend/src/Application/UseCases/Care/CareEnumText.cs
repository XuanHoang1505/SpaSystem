using System.Text.Json;

namespace NhuNguyetSpa.Application.UseCases.Care;

/// <summary>The snake_case names of an enum as sent in request bodies (<c>oily</c>, <c>severe</c>…), same text as the database.</summary>
public static class CareEnumText<TEnum> where TEnum : struct, Enum
{
    private static readonly Dictionary<string, TEnum> ByName = Enum.GetValues<TEnum>()
        .ToDictionary(value => JsonNamingPolicy.SnakeCaseLower.ConvertName(value.ToString()), StringComparer.Ordinal);

    public static string Names => string.Join(", ", ByName.Keys);

    public static bool TryParse(string? text, out TEnum value) => ByName.TryGetValue(text ?? string.Empty, out value);
}
