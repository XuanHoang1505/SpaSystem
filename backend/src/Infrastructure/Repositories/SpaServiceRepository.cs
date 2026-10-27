using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

// Text comparisons use f_unaccent(lower(x)) on both sides, the same expression as the trigram index on name.
public sealed class SpaServiceRepository : Repository<SpaService>, ISpaServiceRepository
{
    public SpaServiceRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<PagedResult<ServiceListItemDto>> SearchAsync(ServiceSearchCriteria criteria, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var query = Set.AsNoTracking();
        if (criteria.PublicOnly)
            query = query.Where(service => service.Status == CatalogStatus.OnSale);
        else if (criteria.Status is { } status)
            query = query.Where(service => service.Status == status);
        if (criteria.Search is { } search)
        {
            var pattern = CatalogSearchText.Contains(search);
            query = query.Where(service =>
                EF.Functions.Like(AppDbContext.Unaccent(service.Name.ToLower()), AppDbContext.Unaccent(pattern.ToLower()), CatalogSearchText.EscapeCharacter) ||
                EF.Functions.Like(AppDbContext.Unaccent(service.Category.ToLower()), AppDbContext.Unaccent(pattern.ToLower()), CatalogSearchText.EscapeCharacter));
        }
        if (criteria.Category is { } category)
            query = query.Where(service => AppDbContext.Unaccent(service.Category.ToLower()) == AppDbContext.Unaccent(category.ToLower()));
        if (criteria.MinPrice is { } minPrice)
            query = query.Where(service => service.Price >= minPrice);
        if (criteria.MaxPrice is { } maxPrice)
            query = query.Where(service => service.Price <= maxPrice);

        var total = await query.CountAsync(cancellationToken);
        var ordered = (criteria.SortBy, criteria.SortDirection) switch
        {
            (CatalogSortField.Price, SortDirection.Desc) => query.OrderByDescending(service => service.Price).ThenBy(service => service.Name),
            (CatalogSortField.Price, _) => query.OrderBy(service => service.Price).ThenBy(service => service.Name),
            (_, SortDirection.Desc) => query.OrderByDescending(service => service.Name),
            _ => query.OrderBy(service => service.Name),
        };
        var items = await ordered.ThenBy(service => service.Id)
            .Skip((criteria.PageNumber - 1) * criteria.PageSize)
            .Take(criteria.PageSize)
            .Select(service => new ServiceListItemDto(
                service.Id, service.Name, service.Category, service.Price, service.DurationMinutes, service.ImageUrl, service.Status))
            .ToListAsync(cancellationToken);
        return new PagedResult<ServiceListItemDto>(items, criteria.PageNumber, criteria.PageSize, total);
    }

    public Task<ServiceDetailDto?> GetDetailAsync(Guid id, bool publicOnly, CancellationToken cancellationToken) => Set.AsNoTracking()
        .Where(service => service.Id == id && (!publicOnly || service.Status == CatalogStatus.OnSale))
        .Select(service => new ServiceDetailDto(
            service.Id, service.Name, service.Category, service.Description, service.Price, service.DurationMinutes, service.ImageUrl,
            service.Status, service.CreatedAtUtc, service.UpdatedAtUtc))
        .FirstOrDefaultAsync(cancellationToken);

    public Task<string?> FindCategoryAsync(string category, Guid? excludeServiceId, CancellationToken cancellationToken) => Set.AsNoTracking()
        .Where(service => (excludeServiceId == null || service.Id != excludeServiceId) &&
                          AppDbContext.Unaccent(service.Category.ToLower()) == AppDbContext.Unaccent(category.ToLower()))
        .OrderBy(service => service.CreatedAtUtc)
        .Select(service => service.Category)
        .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<string>> GetCategoriesAsync(bool publicOnly, CancellationToken cancellationToken) => await Set.AsNoTracking()
        .Where(service => !publicOnly || service.Status == CatalogStatus.OnSale)
        .Select(service => service.Category)
        .Distinct()
        .OrderBy(category => category)
        .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<SpaService>> GetByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken) =>
        await Set.Where(service => ids.Contains(service.Id)).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<SuggestionCandidate>> SuggestAsync(string search, int limit, CancellationToken cancellationToken)
    {
        var contains = CatalogSearchText.Contains(search);
        var prefix = CatalogSearchText.StartsWith(search);
        var rows = await Set.AsNoTracking()
            .Where(service => service.Status == CatalogStatus.OnSale &&
                              EF.Functions.Like(AppDbContext.Unaccent(service.Name.ToLower()), AppDbContext.Unaccent(contains.ToLower()), CatalogSearchText.EscapeCharacter))
            .Select(service => new
            {
                service.Id,
                service.Name,
                service.ImageUrl,
                IsPrefix = EF.Functions.Like(AppDbContext.Unaccent(service.Name.ToLower()), AppDbContext.Unaccent(prefix.ToLower()), CatalogSearchText.EscapeCharacter),
            })
            .OrderByDescending(row => row.IsPrefix).ThenBy(row => row.Name).ThenBy(row => row.Id)
            .Take(limit)
            .ToListAsync(cancellationToken);
        return rows.Select(row => new SuggestionCandidate(new CatalogSuggestionDto(CatalogItemType.Service, row.Id, row.Name, row.ImageUrl), row.IsPrefix)).ToList();
    }
}
