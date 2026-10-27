using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Interfaces.Services.Catalog;

/// <summary>Search helpers for UC-SPA-06: category filter values and type-ahead suggestions (A1).</summary>
public interface ICatalogSearchService
{
    Task<OperationResult<IReadOnlyList<string>>> GetCategoriesAsync(CancellationToken cancellationToken);
    Task<OperationResult<IReadOnlyList<CatalogSuggestionDto>>> SuggestAsync(SuggestionQuery query, CancellationToken cancellationToken);
}
