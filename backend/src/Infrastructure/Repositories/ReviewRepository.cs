using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Reviews;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

/// <summary>Review reads (docs/specs/reviews.md); every list is newest first, then by id for a stable page.</summary>
public sealed class ReviewRepository : Repository<Review>, IReviewRepository
{
    private static readonly Expression<Func<Review, MyReviewDto>> ToMine = review => new MyReviewDto(
        review.Id,
        review.SpaServiceId != null ? CatalogItemType.Service : CatalogItemType.Package,
        review.SpaServiceId ?? review.ServicePackageId!.Value,
        review.SpaServiceId != null ? review.SpaService!.Name : review.ServicePackage!.Name,
        review.SpaServiceId != null
            ? review.SpaService!.ImageUrl
            : review.ServicePackage!.ImageUrl ?? review.ServicePackage.Items.OrderBy(item => item.SortOrder)
                .Select(item => item.SpaService.ImageUrl).FirstOrDefault(),
        review.Rating,
        review.Comment,
        review.ImageUrl,
        review.Status,
        review.OwnerReply,
        review.RepliedAtUtc,
        review.CreatedAtUtc,
        review.UpdatedAtUtc);

    private static readonly Expression<Func<Review, OwnerReviewDto>> ToOwner = review => new OwnerReviewDto(
        review.Id,
        review.SpaServiceId != null ? CatalogItemType.Service : CatalogItemType.Package,
        review.SpaServiceId ?? review.ServicePackageId!.Value,
        review.SpaServiceId != null ? review.SpaService!.Name : review.ServicePackage!.Name,
        new OwnerReviewCustomerDto(review.CustomerId, review.Customer.User.FullName, review.Customer.User.Email, review.Customer.User.PhoneNumber),
        review.Rating,
        review.Comment,
        review.ImageUrl,
        review.Status,
        review.OwnerReply,
        review.RepliedAtUtc,
        review.CreatedAtUtc,
        review.UpdatedAtUtc);

    public ReviewRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<PagedResult<PublicReviewDto>> GetPublicPageAsync(
        CatalogItemType type, Guid productId, int? rating, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = VisibleOf(type, productId);
        if (rating is { } stars)
            query = query.Where(review => review.Rating == stars);
        var total = await query.CountAsync(cancellationToken);
        var items = await Newest(query)
            .Skip((pageNumber - 1) * pageSize).Take(pageSize)
            .Select(review => new PublicReviewDto(
                review.Id, review.Rating, review.Comment, review.ImageUrl, review.Customer.User.FullName,
                review.CreatedAtUtc, review.OwnerReply, review.RepliedAtUtc))
            .ToListAsync(cancellationToken);
        return new PagedResult<PublicReviewDto>(items, pageNumber, pageSize, total);
    }

    public async Task<IReadOnlyDictionary<int, int>> GetRatingCountsAsync(CatalogItemType type, Guid productId, CancellationToken cancellationToken) =>
        await VisibleOf(type, productId)
            .GroupBy(review => review.Rating)
            .Select(group => new { Rating = group.Key, Count = group.Count() })
            .ToDictionaryAsync(row => row.Rating, row => row.Count, cancellationToken);

    public async Task<IReadOnlyDictionary<Guid, (int Count, int Sum)>> GetRatingStatsAsync(
        CatalogItemType type, IReadOnlyCollection<Guid> productIds, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(productIds);
        if (productIds.Count == 0)
            return new Dictionary<Guid, (int, int)>();
        var visible = Set.AsNoTracking().Where(review => review.Status == ReviewStatus.Visible);
        var rows = type == CatalogItemType.Service
            ? await visible.Where(review => review.SpaServiceId != null && productIds.Contains(review.SpaServiceId.Value))
                .GroupBy(review => review.SpaServiceId!.Value)
                .Select(group => new { Id = group.Key, Count = group.Count(), Sum = group.Sum(review => review.Rating) })
                .ToListAsync(cancellationToken)
            : await visible.Where(review => review.ServicePackageId != null && productIds.Contains(review.ServicePackageId.Value))
                .GroupBy(review => review.ServicePackageId!.Value)
                .Select(group => new { Id = group.Key, Count = group.Count(), Sum = group.Sum(review => review.Rating) })
                .ToListAsync(cancellationToken);
        return rows.ToDictionary(row => row.Id, row => (row.Count, row.Sum));
    }

    public async Task<ReviewFacts> GetFactsAsync(Guid customerId, CatalogItemType? onlyType, Guid? onlyProductId, CancellationToken cancellationToken)
    {
        var services = onlyType == CatalogItemType.Package
            ? []
            : await GetServiceFactsAsync(customerId, onlyType is null ? null : onlyProductId, cancellationToken);
        var packages = onlyType == CatalogItemType.Service
            ? []
            : await GetPackageFactsAsync(customerId, onlyType is null ? null : onlyProductId, cancellationToken);

        var reviews = await Set.AsNoTracking()
            .Where(review => review.CustomerId == customerId)
            .Select(review => new { review.Id, review.SpaServiceId, review.ServicePackageId })
            .ToListAsync(cancellationToken);
        var existing = reviews
            .Select(review => (Key: review.SpaServiceId is { } serviceId
                ? (CatalogItemType.Service, serviceId)
                : (CatalogItemType.Package, review.ServicePackageId!.Value), review.Id))
            .Where(row => onlyType is null || (row.Key.Item1 == onlyType && row.Key.Item2 == onlyProductId))
            .ToDictionary(row => row.Key, row => row.Id);
        return new ReviewFacts(services, packages, existing);
    }

    public Task<Review?> GetMineAsync(Guid id, Guid customerId, CancellationToken cancellationToken) =>
        Set.FirstOrDefaultAsync(review => review.Id == id && review.CustomerId == customerId, cancellationToken);

    public Task<MyReviewDto?> GetMineDtoAsync(Guid id, Guid customerId, CancellationToken cancellationToken) =>
        Set.AsNoTracking().Where(review => review.Id == id && review.CustomerId == customerId).Select(ToMine).FirstOrDefaultAsync(cancellationToken);

    public async Task<PagedResult<MyReviewDto>> GetMinePageAsync(Guid customerId, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = Set.AsNoTracking().Where(review => review.CustomerId == customerId);
        var total = await query.CountAsync(cancellationToken);
        var items = await Newest(query).Skip((pageNumber - 1) * pageSize).Take(pageSize).Select(ToMine).ToListAsync(cancellationToken);
        return new PagedResult<MyReviewDto>(items, pageNumber, pageSize, total);
    }

    public async Task<PagedResult<OwnerReviewDto>> SearchAsync(OwnerReviewCriteria criteria, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var query = Set.AsNoTracking();
        if (criteria.Rating is { } rating)
            query = query.Where(review => review.Rating == rating);
        if (criteria.ProductType == CatalogItemType.Service)
            query = query.Where(review => review.SpaServiceId != null);
        if (criteria.ProductType == CatalogItemType.Package)
            query = query.Where(review => review.ServicePackageId != null);
        if (criteria.SpaServiceId is { } serviceId)
            query = query.Where(review => review.SpaServiceId == serviceId);
        if (criteria.ServicePackageId is { } packageId)
            query = query.Where(review => review.ServicePackageId == packageId);
        if (criteria.Status is { } status)
            query = query.Where(review => review.Status == status);
        if (criteria.HasReply is { } hasReply)
            query = hasReply ? query.Where(review => review.OwnerReply != null) : query.Where(review => review.OwnerReply == null);
        if (criteria.FromUtc is { } from)
            query = query.Where(review => review.CreatedAtUtc >= from);
        if (criteria.ToUtcExclusive is { } to)
            query = query.Where(review => review.CreatedAtUtc < to);
        if (criteria.Search is { } search)
        {
            var pattern = CatalogSearchText.Contains(search);
            var folded = pattern.ToLower();
            // Email is citext, so LIKE on it already ignores case.
            query = query.Where(review =>
                EF.Functions.Like(AppDbContext.Unaccent(review.Customer.User.FullName.ToLower()), AppDbContext.Unaccent(folded), CatalogSearchText.EscapeCharacter) ||
                EF.Functions.Like(review.Customer.User.PhoneNumber, pattern, CatalogSearchText.EscapeCharacter) ||
                EF.Functions.Like(review.Customer.User.Email, pattern, CatalogSearchText.EscapeCharacter) ||
                (review.SpaServiceId != null &&
                 EF.Functions.Like(AppDbContext.Unaccent(review.SpaService!.Name.ToLower()), AppDbContext.Unaccent(folded), CatalogSearchText.EscapeCharacter)) ||
                (review.ServicePackageId != null &&
                 EF.Functions.Like(AppDbContext.Unaccent(review.ServicePackage!.Name.ToLower()), AppDbContext.Unaccent(folded), CatalogSearchText.EscapeCharacter)));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await Newest(query)
            .Skip((criteria.PageNumber - 1) * criteria.PageSize).Take(criteria.PageSize)
            .Select(ToOwner).ToListAsync(cancellationToken);
        return new PagedResult<OwnerReviewDto>(items, criteria.PageNumber, criteria.PageSize, total);
    }

    public Task<OwnerReviewDto?> GetOwnerDtoAsync(Guid id, CancellationToken cancellationToken) =>
        Set.AsNoTracking().Where(review => review.Id == id).Select(ToOwner).FirstOrDefaultAsync(cancellationToken);

    private IQueryable<Review> VisibleOf(CatalogItemType type, Guid productId)
    {
        var visible = Set.AsNoTracking().Where(review => review.Status == ReviewStatus.Visible);
        return type == CatalogItemType.Service
            ? visible.Where(review => review.SpaServiceId == productId)
            : visible.Where(review => review.ServicePackageId == productId);
    }

    private static IQueryable<Review> Newest(IQueryable<Review> query) =>
        query.OrderByDescending(review => review.CreatedAtUtc).ThenBy(review => review.Id);

    /// <summary>
    /// Services of the customer's entitlements (an expired one was never used) and of their completed package sessions;
    /// <c>Used</c> when an entitlement is used or a session of the service is completed (BR-REV-01).
    /// </summary>
    private async Task<IReadOnlyList<ReviewServiceFact>> GetServiceFactsAsync(Guid customerId, Guid? onlyServiceId, CancellationToken cancellationToken)
    {
        var entitlements = Context.ServiceEntitlements.AsNoTracking()
            .Where(entitlement => entitlement.CustomerId == customerId
                && entitlement.Status != EntitlementStatus.Expired
                && entitlement.OrderItem.SpaServiceId != null);
        if (onlyServiceId is { } id)
            entitlements = entitlements.Where(entitlement => entitlement.OrderItem.SpaServiceId == id);
        var fromEntitlements = await entitlements
            .Select(entitlement => new { ServiceId = entitlement.OrderItem.SpaServiceId!.Value, Used = entitlement.Status == EntitlementStatus.Used })
            .ToListAsync(cancellationToken);

        var sessions = Context.TreatmentSessions.AsNoTracking()
            .Where(session => session.TreatmentPlan.CustomerPackage.CustomerId == customerId && session.Status == TreatmentSessionStatus.Completed);
        if (onlyServiceId is { } sessionServiceId)
            sessions = sessions.Where(session => session.SpaServiceId == sessionServiceId);
        var fromSessions = await sessions.Select(session => session.SpaServiceId).Distinct().ToListAsync(cancellationToken);

        var used = fromEntitlements.Where(row => row.Used).Select(row => row.ServiceId).Concat(fromSessions).ToHashSet();
        var ids = fromEntitlements.Select(row => row.ServiceId).Concat(fromSessions).Distinct().ToList();
        if (ids.Count == 0)
            return [];
        var products = await Context.SpaServices.AsNoTracking()
            .Where(service => ids.Contains(service.Id))
            .Select(service => new { service.Id, service.Name, service.ImageUrl })
            .ToListAsync(cancellationToken);
        return products.Select(product => new ReviewServiceFact(product.Id, product.Name, product.ImageUrl, used.Contains(product.Id))).ToList();
    }

    /// <summary>Packages the customer bought, any status, with the highest <c>used_sessions</c> among their copies (BR-REV-01).</summary>
    private async Task<IReadOnlyList<ReviewPackageFact>> GetPackageFactsAsync(Guid customerId, Guid? onlyPackageId, CancellationToken cancellationToken)
    {
        var packages = Context.CustomerPackages.AsNoTracking()
            .Where(package => package.CustomerId == customerId && package.OrderItem.ServicePackageId != null);
        if (onlyPackageId is { } id)
            packages = packages.Where(package => package.OrderItem.ServicePackageId == id);
        var used = await packages
            .GroupBy(package => package.OrderItem.ServicePackageId!.Value)
            .Select(group => new { Id = group.Key, Max = group.Max(package => package.UsedSessions) })
            .ToDictionaryAsync(row => row.Id, row => row.Max, cancellationToken);
        if (used.Count == 0)
            return [];
        var ids = used.Keys.ToList();
        var products = await Context.ServicePackages.AsNoTracking()
            .Where(package => ids.Contains(package.Id))
            .Select(package => new
            {
                package.Id,
                package.Name,
                ImageUrl = package.ImageUrl ?? package.Items.OrderBy(item => item.SortOrder).Select(item => item.SpaService.ImageUrl).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);
        return products.Select(product => new ReviewPackageFact(product.Id, product.Name, product.ImageUrl, used[product.Id])).ToList();
    }
}
