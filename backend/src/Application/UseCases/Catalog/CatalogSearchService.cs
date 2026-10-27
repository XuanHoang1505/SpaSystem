using System.Globalization;
using FluentValidation;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;

namespace NhuNguyetSpa.Application.UseCases.Catalog;

/// <summary>UC-SPA-06 category filter values and suggestions (A1). Suggestions always use the guest view.</summary>
public sealed class CatalogSearchService : ICatalogSearchService
{
    public const int MaxSuggestions = 8;

    private static readonly StringComparer NameOrder = StringComparer.Create(CultureInfo.GetCultureInfo("vi-VN"), ignoreCase: true);

    private readonly ISpaServiceRepository _services;
    private readonly IServicePackageRepository _packages;
    private readonly CatalogViewer _viewer;
    private readonly IValidator<SuggestionQuery> _suggestionValidator;

    public CatalogSearchService(
        ISpaServiceRepository services, IServicePackageRepository packages, CatalogViewer viewer, IValidator<SuggestionQuery> suggestionValidator)
    {
        _services = services;
        _packages = packages;
        _viewer = viewer;
        _suggestionValidator = suggestionValidator;
    }

    public async Task<OperationResult<IReadOnlyList<string>>> GetCategoriesAsync(CancellationToken cancellationToken) =>
        OperationResult<IReadOnlyList<string>>.Success(await _services.GetCategoriesAsync(publicOnly: !_viewer.IsOwner, cancellationToken));

    public async Task<OperationResult<IReadOnlyList<CatalogSuggestionDto>>> SuggestAsync(SuggestionQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        await _suggestionValidator.ValidateAndThrowAsync(query, cancellationToken);
        var search = query.Search!.Trim();
        var services = await _services.SuggestAsync(search, MaxSuggestions, cancellationToken);
        var packages = await _packages.SuggestAsync(search, _viewer.Today, MaxSuggestions, cancellationToken);
        IReadOnlyList<CatalogSuggestionDto> merged = services.Concat(packages)
            .OrderByDescending(candidate => candidate.StartsWithSearch)
            .ThenBy(candidate => candidate.Item.Name, NameOrder)
            .Take(MaxSuggestions)
            .Select(candidate => candidate.Item)
            .ToList();
        return OperationResult<IReadOnlyList<CatalogSuggestionDto>>.Success(merged);
    }
}
