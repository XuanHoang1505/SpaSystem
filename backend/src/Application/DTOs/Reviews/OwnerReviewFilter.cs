namespace NhuNguyetSpa.Application.DTOs.Reviews;

/// <summary>Filters of <c>GET /reviews</c> besides paging and <c>search</c> (UC-SPA-31); dates are Vietnam days of creation.</summary>
public sealed class OwnerReviewFilter
{
    public int? Rating { get; set; }

    /// <summary><c>service</c> or <c>package</c>.</summary>
    public string? ProductType { get; set; }

    public Guid? SpaServiceId { get; set; }

    public Guid? ServicePackageId { get; set; }

    /// <summary><c>visible</c> or <c>hidden</c>.</summary>
    public string? Status { get; set; }

    public bool? HasReply { get; set; }

    public DateOnly? FromDate { get; set; }

    public DateOnly? ToDate { get; set; }
}
