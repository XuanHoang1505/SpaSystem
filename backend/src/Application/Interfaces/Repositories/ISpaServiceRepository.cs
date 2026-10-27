using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>Text matching here is case- and accent-insensitive (BR-CAT-05).</summary>
public interface ISpaServiceRepository : IRepository<SpaService>
{
    Task<PagedResult<ServiceListItemDto>> SearchAsync(ServiceSearchCriteria criteria, CancellationToken cancellationToken);

    /// <summary>Null when missing, or when <paramref name="publicOnly"/> and the service is not on sale.</summary>
    Task<ServiceDetailDto?> GetDetailAsync(Guid id, bool publicOnly, CancellationToken cancellationToken);

    /// <summary>The stored spelling of a category equal to <paramref name="category"/>, ignoring the service being edited.</summary>
    Task<string?> FindCategoryAsync(string category, Guid? excludeServiceId, CancellationToken cancellationToken);

    /// <summary>Distinct categories ordered by name; <paramref name="publicOnly"/> keeps those with an on-sale service.</summary>
    Task<IReadOnlyList<string>> GetCategoriesAsync(bool publicOnly, CancellationToken cancellationToken);

    Task<IReadOnlyList<SpaService>> GetByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken);

    /// <summary>On-sale services whose name contains <paramref name="search"/>, prefix matches first.</summary>
    Task<IReadOnlyList<SuggestionCandidate>> SuggestAsync(string search, int limit, CancellationToken cancellationToken);
}
