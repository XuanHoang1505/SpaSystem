using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Reviews;

namespace NhuNguyetSpa.Application.Interfaces.Services.Reviews;

/// <summary>UC-SPA-30: the signed-in customer reviews what they used (docs/specs/reviews.md).</summary>
public interface IMyReviewService
{
    Task<OperationResult<IReadOnlyList<ReviewableProductDto>>> ListReviewableAsync(CancellationToken cancellationToken);

    Task<OperationResult<MyReviewDto>> CreateAsync(CreateReviewRequest request, CancellationToken cancellationToken);

    Task<OperationResult<PagedResult<MyReviewDto>>> ListMineAsync(PagedQuery query, CancellationToken cancellationToken);

    Task<OperationResult<MyReviewDto>> GetMineAsync(Guid id, CancellationToken cancellationToken);

    Task<OperationResult<MyReviewDto>> UpdateAsync(Guid id, UpdateReviewRequest request, CancellationToken cancellationToken);

    Task<OperationResult<MyReviewDto>> UploadImageAsync(Guid id, ImageUploadRequest file, CancellationToken cancellationToken);

    Task DeleteImageAsync(Guid id, CancellationToken cancellationToken);
}
