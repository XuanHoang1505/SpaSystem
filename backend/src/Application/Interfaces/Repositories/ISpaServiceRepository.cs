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

    /// <summary>Tracked steps of a service, ordered by sort order (Q-71).</summary>
    Task<IReadOnlyList<ServiceStep>> GetStepsAsync(Guid serviceId, CancellationToken cancellationToken);

    /// <summary>Deletes <paramref name="current"/> and adds <paramref name="next"/>; saved with the unit of work (BR-CAT-17).</summary>
    void ReplaceSteps(IReadOnlyCollection<ServiceStep> current, IReadOnlyCollection<ServiceStep> next);

    Task<IReadOnlyList<SpaService>> GetByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken);

    /// <summary>On-sale services whose name contains <paramref name="search"/>, prefix matches first.</summary>
    Task<IReadOnlyList<SuggestionCandidate>> SuggestAsync(string search, int limit, CancellationToken cancellationToken);
}
