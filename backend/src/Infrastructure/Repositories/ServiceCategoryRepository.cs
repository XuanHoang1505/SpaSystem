using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

/// <summary>Service categories (Q-13). Name comparisons use f_unaccent(lower(x)), like the unique index.</summary>
public sealed class ServiceCategoryRepository : Repository<ServiceCategory>, IServiceCategoryRepository
{
    public ServiceCategoryRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<ServiceCategoryDto>> ListAsync(bool publicOnly, CancellationToken cancellationToken)
    {
        var services = Context.SpaServices.AsNoTracking().Where(service => !publicOnly || service.Status == CatalogStatus.OnSale);
        var rows = Set.AsNoTracking()
            .Select(category => new
            {
                Category = category,
                Count = services.Count(service => service.CategoryId == category.Id),
            });
        if (publicOnly)
            rows = rows.Where(row => row.Category.IsActive && row.Count > 0);
        return await rows
            .OrderBy(row => row.Category.SortOrder).ThenBy(row => row.Category.Name).ThenBy(row => row.Category.Id)
            .Select(row => new ServiceCategoryDto(
                row.Category.Id, row.Category.Name, row.Category.Description, row.Category.SortOrder, row.Category.IsActive, row.Count))
            .ToListAsync(cancellationToken);
    }

    public Task<bool> NameExistsAsync(string name, Guid? excludeId, CancellationToken cancellationToken) => Set.AsNoTracking()
        .AnyAsync(category => (excludeId == null || category.Id != excludeId) &&
                              AppDbContext.Unaccent(category.Name.ToLower()) == AppDbContext.Unaccent(name.ToLower()), cancellationToken);

    public Task<int> CountServicesAsync(Guid id, CancellationToken cancellationToken) =>
        Context.SpaServices.CountAsync(service => service.CategoryId == id, cancellationToken);

    public Task<ServiceCategory?> FindByNameAsync(string name, CancellationToken cancellationToken) => Set.AsNoTracking()
        .Where(category => AppDbContext.Unaccent(category.Name.ToLower()) == AppDbContext.Unaccent(name.Trim().ToLower()))
        .FirstOrDefaultAsync(cancellationToken);
}
