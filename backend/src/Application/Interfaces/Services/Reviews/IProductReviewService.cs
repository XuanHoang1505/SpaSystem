using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Reviews;

namespace NhuNguyetSpa.Application.Interfaces.Services.Reviews;

/// <summary>UC-SPA-29: visible reviews of a product the caller may see (docs/specs/reviews.md).</summary>
public interface IProductReviewService
{
    Task<OperationResult<ProductReviewsDto>> GetForServiceAsync(Guid serviceId, PagedQuery query, ProductReviewFilter filter, CancellationToken cancellationToken);

    Task<OperationResult<ProductReviewsDto>> GetForPackageAsync(Guid packageId, PagedQuery query, ProductReviewFilter filter, CancellationToken cancellationToken);
}
