using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Promotions;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class PromotionRepository : Repository<Promotion>, IPromotionRepository
{
    public PromotionRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<PagedResult<PromotionDto>> SearchAsync(PromotionSearchCriteria criteria, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var query = Set.AsNoTracking();
        if (criteria.Search is { } search)
        {
            // Codes are upper-case ASCII; descriptions are matched like catalog names (case- and accent-insensitive).
            var pattern = CatalogSearchText.Contains(search);
            query = query.Where(promotion =>
                EF.Functions.ILike(promotion.Code, pattern, CatalogSearchText.EscapeCharacter) ||
                (promotion.Description != null &&
                 EF.Functions.Like(AppDbContext.Unaccent(promotion.Description.ToLower()), AppDbContext.Unaccent(pattern.ToLower()), CatalogSearchText.EscapeCharacter)));
        }
        if (criteria.Status is { } status)
            query = query.Where(promotion => promotion.Status == status);
        if (criteria.FromUtc is { } from)
            query = query.Where(promotion => promotion.EndsAtUtc > from);
        if (criteria.ToUtcExclusive is { } to)
            query = query.Where(promotion => promotion.StartsAtUtc < to);

        var total = await query.CountAsync(cancellationToken);
        var ordered = (criteria.SortBy, criteria.SortDirection) switch
        {
            (PromotionSortField.Code, SortDirection.Desc) => query.OrderByDescending(promotion => promotion.Code),
            (PromotionSortField.Code, _) => query.OrderBy(promotion => promotion.Code),
            (_, SortDirection.Desc) => query.OrderByDescending(promotion => promotion.StartsAtUtc).ThenBy(promotion => promotion.Code),
            _ => query.OrderBy(promotion => promotion.StartsAtUtc).ThenBy(promotion => promotion.Code),
        };
        var items = await ordered.ThenBy(promotion => promotion.Id)
            .Skip((criteria.PageNumber - 1) * criteria.PageSize)
            .Take(criteria.PageSize)
            .Select(ToDto())
            .ToListAsync(cancellationToken);
        return new PagedResult<PromotionDto>(items, criteria.PageNumber, criteria.PageSize, total);
    }

    public Task<PromotionDto?> GetDtoAsync(Guid id, CancellationToken cancellationToken) =>
        Set.AsNoTracking().Where(promotion => promotion.Id == id).Select(ToDto()).FirstOrDefaultAsync(cancellationToken);

    public Task<bool> CodeExistsAsync(string code, Guid? excludeId, CancellationToken cancellationToken) =>
        Set.AnyAsync(promotion => promotion.Code == code && (excludeId == null || promotion.Id != excludeId), cancellationToken);

    public Task<Promotion?> GetByCodeAsync(string code, bool forUpdate, CancellationToken cancellationToken) => forUpdate
        ? Set.FromSql($"SELECT * FROM promotions WHERE code = {code} FOR UPDATE").FirstOrDefaultAsync(cancellationToken)
        : Set.FirstOrDefaultAsync(promotion => promotion.Code == code, cancellationToken);

    public Task<int> CountCountedRedemptionsAsync(Guid promotionId, Guid? customerId, DateTime nowUtc, CancellationToken cancellationToken) =>
        Context.PromotionRedemptions.AsNoTracking()
            .Where(redemption => redemption.PromotionId == promotionId)
            .Where(redemption => customerId == null || redemption.Order.CustomerId == customerId)
            .CountAsync(redemption => redemption.Order.Status == OrderStatus.Paid ||
                                      (redemption.Order.Status == OrderStatus.PendingPayment && redemption.Order.PaymentDueAtUtc > nowUtc),
                cancellationToken);

    private Expression<Func<Promotion, PromotionDto>> ToDto()
    {
        var redemptions = Context.PromotionRedemptions;
        return promotion => new PromotionDto(
            promotion.Id, promotion.Code, promotion.Description, promotion.DiscountType, promotion.DiscountValue, promotion.MinOrderAmount,
            promotion.MaxDiscountAmount, promotion.StartsAtUtc, promotion.EndsAtUtc, promotion.PerCustomerLimit, promotion.UsageLimit,
            promotion.Status,
            redemptions.Count(redemption => redemption.PromotionId == promotion.Id && redemption.Order.Status == OrderStatus.Paid));
    }
}
