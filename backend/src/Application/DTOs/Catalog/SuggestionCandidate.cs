namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary>A suggestion plus whether its name starts with the search text (accent-insensitive); prefix matches rank first.</summary>
public sealed record SuggestionCandidate(CatalogSuggestionDto Item, bool StartsWithSearch);
