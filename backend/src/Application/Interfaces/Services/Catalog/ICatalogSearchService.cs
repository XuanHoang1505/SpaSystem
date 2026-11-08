using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Interfaces.Services.Catalog;

/// <summary>Type-ahead suggestions for UC-SPA-06 (A1).</summary>
public interface ICatalogSearchService
{
    Task<OperationResult<IReadOnlyList<CatalogSuggestionDto>>> SuggestAsync(SuggestionQuery query, CancellationToken cancellationToken);
}
