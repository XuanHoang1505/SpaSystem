using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class ServicePackageRepository : Repository<ServicePackage>, IServicePackageRepository
{
    // BR-CAT-07: the package image, else the image of the first item (by sort order) whose service has one. Read-time only.
    private static readonly Expression<Func<ServicePackage, PackageListItemDto>> ToListItem = package => new PackageListItemDto(
        package.Id, package.Name, package.Price, package.ValidityDays, package.Items.Sum(item => item.SessionCount),
        package.ImageUrl ?? package.Items.Where(item => item.SpaService.ImageUrl != null).OrderBy(item => item.SortOrder)
            .Select(item => item.SpaService.ImageUrl).FirstOrDefault(),
        package.Status, package.SaleStartDate, package.SaleEndDate);

    public ServicePackageRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<PagedResult<PackageListItemDto>> SearchAsync(PackageSearchCriteria criteria, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var query = Visible(Set.AsNoTracking(), criteria.PublicOn);
        if (criteria.PublicOn is null && criteria.Status is { } status)
            query = query.Where(package => package.Status == status);
        if (criteria.Search is { } search)
        {
            var pattern = CatalogSearchText.Contains(search);
            query = query.Where(package =>
                EF.Functions.Like(AppDbContext.Unaccent(package.Name.ToLower()), AppDbContext.Unaccent(pattern.ToLower()), CatalogSearchText.EscapeCharacter));
        }
        if (criteria.MinPrice is { } minPrice)
            query = query.Where(package => package.Price >= minPrice);
        if (criteria.MaxPrice is { } maxPrice)
            query = query.Where(package => package.Price <= maxPrice);

        var total = await query.CountAsync(cancellationToken);
        var ordered = (criteria.SortBy, criteria.SortDirection) switch
        {
            (CatalogSortField.Price, SortDirection.Desc) => query.OrderByDescending(package => package.Price).ThenBy(package => package.Name),
            (CatalogSortField.Price, _) => query.OrderBy(package => package.Price).ThenBy(package => package.Name),
            (_, SortDirection.Desc) => query.OrderByDescending(package => package.Name),
            _ => query.OrderBy(package => package.Name),
        };
        var items = await ordered.ThenBy(package => package.Id)
            .Skip((criteria.PageNumber - 1) * criteria.PageSize)
            .Take(criteria.PageSize)
            .Select(ToListItem)
            .ToListAsync(cancellationToken);
        return new PagedResult<PackageListItemDto>(items, criteria.PageNumber, criteria.PageSize, total);
    }

    public Task<PackageDetailDto?> GetDetailAsync(Guid id, DateOnly? publicOn, CancellationToken cancellationToken) =>
        Visible(Set.AsNoTracking(), publicOn)
            .Where(package => package.Id == id)
            .Select(package => new PackageDetailDto(
                package.Id, package.Name, package.Description, package.Price, package.ValidityDays,
                package.Items.Sum(item => item.SessionCount),
                package.ImageUrl ?? package.Items.Where(item => item.SpaService.ImageUrl != null).OrderBy(item => item.SortOrder)
                    .Select(item => item.SpaService.ImageUrl).FirstOrDefault(),
                package.Status, package.SaleStartDate, package.SaleEndDate, package.CreatedAtUtc, package.UpdatedAtUtc,
                package.Items.OrderBy(item => item.SortOrder)
                    .Select(item => new PackageItemDto(
                        item.SpaServiceId, item.SpaService.Name, item.SpaService.ImageUrl, item.SpaService.Status, item.SessionCount,
                        item.SortOrder, item.MinDaysBetweenSessions, item.Note))
                    .ToList()))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<ServicePackage>> GetForFulfilmentAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken) =>
        await Set.AsNoTracking()
            .Include(package => package.Items).ThenInclude(item => item.SpaService)
            .Where(package => ids.Contains(package.Id))
            .ToListAsync(cancellationToken);

    public Task<ServicePackage?> GetWithItemsAsync(Guid id, CancellationToken cancellationToken) =>
        Set.Include(package => package.Items).FirstOrDefaultAsync(package => package.Id == id, cancellationToken);

    public void ReplaceItems(ServicePackage package, IReadOnlyCollection<ServicePackageItem> items)
    {
        ArgumentNullException.ThrowIfNull(package);
        // Marked deleted explicitly: the FK is Restrict, so EF would refuse to treat removed items as orphans.
        Context.ServicePackageItems.RemoveRange(package.Items);
        package.ReplaceItems(items);
    }

    public async Task<IReadOnlyList<SuggestionCandidate>> SuggestAsync(string search, DateOnly publicOn, int limit, CancellationToken cancellationToken)
    {
        var contains = CatalogSearchText.Contains(search);
        var prefix = CatalogSearchText.StartsWith(search);
        var rows = await Visible(Set.AsNoTracking(), publicOn)
            .Where(package =>
                EF.Functions.Like(AppDbContext.Unaccent(package.Name.ToLower()), AppDbContext.Unaccent(contains.ToLower()), CatalogSearchText.EscapeCharacter))
            .Select(package => new
            {
                package.Id,
                package.Name,
                ImageUrl = package.ImageUrl ?? package.Items.Where(item => item.SpaService.ImageUrl != null).OrderBy(item => item.SortOrder)
                    .Select(item => item.SpaService.ImageUrl).FirstOrDefault(),
                IsPrefix = EF.Functions.Like(AppDbContext.Unaccent(package.Name.ToLower()), AppDbContext.Unaccent(prefix.ToLower()), CatalogSearchText.EscapeCharacter),
            })
            .OrderByDescending(row => row.IsPrefix).ThenBy(row => row.Name).ThenBy(row => row.Id)
            .Take(limit)
            .ToListAsync(cancellationToken);
        return rows.Select(row => new SuggestionCandidate(new CatalogSuggestionDto(CatalogItemType.Package, row.Id, row.Name, row.ImageUrl), row.IsPrefix)).ToList();
    }

    /// <summary>BR-CAT-01: with a date, only on-sale packages whose sale window (open-ended when null) contains it.</summary>
    private static IQueryable<ServicePackage> Visible(IQueryable<ServicePackage> query, DateOnly? publicOn) => publicOn is { } day
        ? query.Where(package => package.Status == CatalogStatus.OnSale &&
                                 (package.SaleStartDate == null || package.SaleStartDate <= day) &&
                                 (package.SaleEndDate == null || package.SaleEndDate >= day))
        : query;
}
