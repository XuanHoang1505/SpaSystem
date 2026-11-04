using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>Text matching here is case- and accent-insensitive (BR-CAT-05).</summary>
public interface IServicePackageRepository : IRepository<ServicePackage>
{
    Task<PagedResult<PackageListItemDto>> SearchAsync(PackageSearchCriteria criteria, CancellationToken cancellationToken);

    /// <summary>Null when missing, or when <paramref name="publicOn"/> is set and the package is not on sale that day.</summary>
    Task<PackageDetailDto?> GetDetailAsync(Guid id, DateOnly? publicOn, CancellationToken cancellationToken);

    /// <summary>Untracked packages with items and their services, as they are now (entitlements of a paid order, Q-23).</summary>
    Task<IReadOnlyList<ServicePackage>> GetForFulfilmentAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken);

    /// <summary>Tracked package with its items, for editing.</summary>
    Task<ServicePackage?> GetWithItemsAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Deletes the current item rows and attaches <paramref name="items"/> in their place.</summary>
    void ReplaceItems(ServicePackage package, IReadOnlyCollection<ServicePackageItem> items);

    /// <summary>Packages on sale on <paramref name="publicOn"/> whose name contains <paramref name="search"/>, prefix matches first.</summary>
    Task<IReadOnlyList<SuggestionCandidate>> SuggestAsync(string search, DateOnly publicOn, int limit, CancellationToken cancellationToken);
}
