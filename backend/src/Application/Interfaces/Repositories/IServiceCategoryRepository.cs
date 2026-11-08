using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

public interface IServiceCategoryRepository : IRepository<ServiceCategory>
{
    /// <summary>
    /// Categories ordered by sort order then name (BR-CAT-14). <paramref name="publicOnly"/>: active categories with at least one
    /// on_sale service, counting on_sale services (BR-CAT-12); otherwise every category, counting every service.
    /// </summary>
    Task<IReadOnlyList<ServiceCategoryDto>> ListAsync(bool publicOnly, CancellationToken cancellationToken);

    /// <summary>True when another category has the same name ignoring case and accents (BR-CAT-10).</summary>
    Task<bool> NameExistsAsync(string name, Guid? excludeId, CancellationToken cancellationToken);

    /// <summary>Every service of the category, discontinued ones included (BR-CAT-13).</summary>
    Task<int> CountServicesAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Category whose name matches ignoring case and accents, for the AI catalog search.</summary>
    Task<ServiceCategory?> FindByNameAsync(string name, CancellationToken cancellationToken);
}
