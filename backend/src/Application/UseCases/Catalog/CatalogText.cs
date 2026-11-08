using System.Text.RegularExpressions;

namespace NhuNguyetSpa.Application.UseCases.Catalog;

/// <summary>Name normalization for catalog entries: trim and collapse inner whitespace (BR-CAT-10).</summary>
public static partial class CatalogText
{
    public static string NormalizeName(string? value) => value is null ? string.Empty : Whitespace().Replace(value.Trim(), " ");

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();
}
