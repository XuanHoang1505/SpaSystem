using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Reviews;

namespace NhuNguyetSpa.Application.Interfaces.Services.Reviews;

/// <summary>UC-SPA-31: the owner lists, replies to, hides and shows reviews (docs/specs/reviews.md).</summary>
public interface IReviewManagementService
{
    Task<OperationResult<PagedResult<OwnerReviewDto>>> SearchAsync(PagedQuery query, OwnerReviewFilter filter, CancellationToken cancellationToken);

    Task<OperationResult<OwnerReviewDto>> ReplyAsync(Guid id, ReplyReviewRequest request, CancellationToken cancellationToken);

    Task RemoveReplyAsync(Guid id, CancellationToken cancellationToken);

    Task ChangeVisibilityAsync(Guid id, ChangeReviewVisibilityRequest request, CancellationToken cancellationToken);
}
