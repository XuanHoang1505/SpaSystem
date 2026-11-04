using System.Text.Json;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Orders;

/// <summary>The snake_case names of <see cref="OrderStatus"/> used in query strings (same text as the database).</summary>
public static class OrderStatusText
{
    private static readonly Dictionary<string, OrderStatus> ByName = Enum.GetValues<OrderStatus>()
        .ToDictionary(status => JsonNamingPolicy.SnakeCaseLower.ConvertName(status.ToString()), StringComparer.Ordinal);

    /// <summary>Null or blank means "any status" and parses to null.</summary>
    public static bool TryParse(string? text, out OrderStatus? status)
    {
        status = null;
        if (string.IsNullOrWhiteSpace(text))
            return true;
        if (!ByName.TryGetValue(text, out var value))
            return false;
        status = value;
        return true;
    }
}
