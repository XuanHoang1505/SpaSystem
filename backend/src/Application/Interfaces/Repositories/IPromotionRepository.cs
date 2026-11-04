using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Promotions;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

public interface IPromotionRepository : IRepository<Promotion>
{
    Task<PagedResult<PromotionDto>> SearchAsync(PromotionSearchCriteria criteria, CancellationToken cancellationToken);

    Task<PromotionDto?> GetDtoAsync(Guid id, CancellationToken cancellationToken);

    /// <summary><paramref name="code"/> is already normalized (upper-case).</summary>
    Task<bool> CodeExistsAsync(string code, Guid? excludeId, CancellationToken cancellationToken);

    /// <summary>Tracked promotion by normalized code; <paramref name="forUpdate"/> locks the row until the transaction ends.</summary>
    Task<Promotion?> GetByCodeAsync(string code, bool forUpdate, CancellationToken cancellationToken);

    /// <summary>
    /// Uses that count against the limits (BR-PRM-01, Q-21): redemptions of paid orders, and of pending orders still before their
    /// due time. <paramref name="customerId"/> narrows the count to one customer.
    /// </summary>
    Task<int> CountCountedRedemptionsAsync(Guid promotionId, Guid? customerId, DateTime nowUtc, CancellationToken cancellationToken);
}
