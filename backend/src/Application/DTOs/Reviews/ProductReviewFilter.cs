namespace NhuNguyetSpa.Application.DTOs.Reviews;

/// <summary>Query of <c>GET /services/{id}/reviews</c> and <c>/packages/{id}/reviews</c> besides paging (UC-SPA-29 A2).</summary>
public sealed class ProductReviewFilter
{
    public int? Rating { get; set; }
}
