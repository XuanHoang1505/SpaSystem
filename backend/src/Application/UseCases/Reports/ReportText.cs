using NhuNguyetSpa.Application.DTOs.Reports;

namespace NhuNguyetSpa.Application.UseCases.Reports;

/// <summary>Query values of the reports: trimmed, any case; null or blank means the default (<c>month</c>, <c>all</c>).</summary>
public static class ReportText
{
    public static bool TryParseGroupBy(string? value, out RevenueGroupBy groupBy) => TryParse(value, RevenueGroupBy.Month, out groupBy);

    public static bool TryParseProductType(string? value, out ReportProductType productType) =>
        TryParse(value, ReportProductType.All, out productType);

    private static bool TryParse<T>(string? value, T fallback, out T parsed) where T : struct, Enum
    {
        parsed = fallback;
        if (string.IsNullOrWhiteSpace(value))
            return true;
        // Names only: Enum.TryParse would also accept numbers such as "1".
        var name = Enum.GetNames<T>().FirstOrDefault(name => string.Equals(name, value.Trim(), StringComparison.OrdinalIgnoreCase));
        return name is not null && Enum.TryParse(name, out parsed);
    }
}
