namespace NhuNguyetSpa.Infrastructure.Repositories;

/// <summary>Builds LIKE patterns where the user's text is literal (BR-CAT-05): <c>\</c>, <c>%</c>, <c>_</c> are escaped with <c>\</c>.</summary>
internal static class CatalogSearchText
{
    public const string EscapeCharacter = "\\";

    public static string Contains(string term) => "%" + Escape(term) + "%";

    public static string StartsWith(string term) => Escape(term) + "%";

    private static string Escape(string term) => term.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
