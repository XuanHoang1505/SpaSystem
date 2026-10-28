using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Promotions;

namespace NhuNguyetSpa.Application.Interfaces.Services.Promotions;

/// <summary>UC-SPA-14: the owner manages promotions (docs/specs/orders.md).</summary>
public interface IPromotionService
{
    Task<OperationResult<PagedResult<PromotionDto>>> SearchAsync(PagedQuery query, PromotionFilter filter, CancellationToken cancellationToken);

    Task<OperationResult<PromotionDto>> GetAsync(Guid id, CancellationToken cancellationToken);

    Task<OperationResult<PromotionDto>> CreateAsync(SavePromotionRequest request, CancellationToken cancellationToken);

    Task<OperationResult<PromotionDto>> UpdateAsync(Guid id, SavePromotionRequest request, CancellationToken cancellationToken);

    Task ChangeStatusAsync(Guid id, ChangePromotionStatusRequest request, CancellationToken cancellationToken);
}
