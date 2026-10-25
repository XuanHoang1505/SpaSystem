using System.Text.Json;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace NhuNguyetSpa.Infrastructure.Persistence.Conversions;

/// <summary>Stores <typeparamref name="TEnum"/> as snake_case text (<c>PendingPayment</c> ↔ <c>pending_payment</c>).</summary>
public sealed class SnakeCaseEnumConverter<TEnum>() : ValueConverter<TEnum, string>(value => ToProvider(value), value => FromProvider(value))
    where TEnum : struct, Enum
{
    private static readonly Dictionary<TEnum, string> ToText = Enum.GetValues<TEnum>()
        .ToDictionary(value => value, value => JsonNamingPolicy.SnakeCaseLower.ConvertName(value.ToString()));

    private static readonly Dictionary<string, TEnum> FromText = ToText.ToDictionary(pair => pair.Value, pair => pair.Key, StringComparer.Ordinal);

    public static string ToProvider(TEnum value) => ToText[value];

    public static TEnum FromProvider(string value) => FromText.TryGetValue(value, out var result)
        ? result
        : throw new InvalidOperationException($"Unknown {typeof(TEnum).Name} value '{value}' in database.");
}
