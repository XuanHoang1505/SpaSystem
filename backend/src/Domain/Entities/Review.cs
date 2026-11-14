using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>reviews</c> (thesis: DanhGia). See docs/domain/data-model.md and docs/specs/reviews.md.</summary>
public sealed class Review : BaseAuditableEntity
{
    public const int MinRating = 1;
    public const int MaxRating = 5;

    public Guid CustomerId { get; private set; }
    public Customer Customer { get; set; } = null!;
    public Guid? SpaServiceId { get; private set; }
    public SpaService? SpaService { get; set; }
    public Guid? ServicePackageId { get; private set; }
    public ServicePackage? ServicePackage { get; set; }
    public string? Comment { get; private set; }
    public string? OwnerReply { get; private set; }
    public DateTime? RepliedAtUtc { get; private set; }
    public int Rating { get; private set; }
    public string? ImageUrl { get; private set; }
    public ReviewStatus Status { get; private set; }

    /// <summary>A customer's review of exactly one service or package, published at once (WF-11, Q-78).</summary>
    public static Review Create(Guid customerId, Guid? spaServiceId, Guid? servicePackageId, int rating, string? comment)
    {
        if (spaServiceId.HasValue == servicePackageId.HasValue)
            throw new ArgumentException("A review is about exactly one service or one package.");
        EnsureRating(rating);
        return new Review
        {
            CustomerId = customerId,
            SpaServiceId = spaServiceId,
            ServicePackageId = servicePackageId,
            Rating = rating,
            Comment = comment,
            Status = ReviewStatus.Visible,
        };
    }

    /// <summary>The customer changes the rating and comment (BR-REV-04 is checked by the caller).</summary>
    public void Edit(int rating, string? comment)
    {
        EnsureRating(rating);
        Rating = rating;
        Comment = comment;
    }

    public void SetImage(string url) => ImageUrl = url;

    public void RemoveImage() => ImageUrl = null;

    /// <summary>The spa's reply; a new reply replaces the old one (BR-REV-08).</summary>
    public void Reply(string reply, DateTime nowUtc)
    {
        OwnerReply = reply;
        RepliedAtUtc = nowUtc;
    }

    public void RemoveReply()
    {
        OwnerReply = null;
        RepliedAtUtc = null;
    }

    /// <summary>Reviews are never deleted, only hidden (BR-REV-02).</summary>
    public void Hide() => Status = ReviewStatus.Hidden;

    public void Show() => Status = ReviewStatus.Visible;

    private static void EnsureRating(int rating)
    {
        if (rating is < MinRating or > MaxRating)
            throw new ArgumentOutOfRangeException(nameof(rating), rating, "Rating must be between 1 and 5.");
    }
}
