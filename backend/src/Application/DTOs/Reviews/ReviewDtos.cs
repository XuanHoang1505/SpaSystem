using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Reviews;

/// <summary>
/// A visible review on a product page: no customer id or contact details (BR-REV-05). No <c>updatedAtUtc</c>: the audit column
/// also moves on owner replies and hide/show, so it would mark reviews the customer never edited as edited.
/// </summary>
public sealed record PublicReviewDto(
    Guid Id,
    int Rating,
    string? Comment,
    string? ImageUrl,
    string ReviewerName,
    DateTime CreatedAtUtc,
    string? OwnerReply,
    DateTime? RepliedAtUtc);

/// <summary><c>GET /services/{id}/reviews</c>, <c>GET /packages/{id}/reviews</c>: summary of every visible review + one page.</summary>
public sealed record ProductReviewsDto(RatingSummaryDto Summary, PagedResult<PublicReviewDto> Page);

/// <summary>
/// The signed-in customer's own review; <see cref="CanEdit"/> and <see cref="EditDeadlineAtUtc"/> come from <c>ReviewEditPolicy</c>.
/// <c>UpdatedAtUtc</c> is the last change by anyone (customer edit, owner reply, hide/show), not "edited by the customer".
/// </summary>
public sealed record MyReviewDto(
    Guid Id,
    CatalogItemType ProductType,
    Guid ProductId,
    string ProductName,
    string? ProductImageUrl,
    int Rating,
    string? Comment,
    string? ImageUrl,
    ReviewStatus Status,
    string? OwnerReply,
    DateTime? RepliedAtUtc,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc)
{
    public bool CanEdit { get; init; }

    public DateTime? EditDeadlineAtUtc { get; init; }
}

public sealed record OwnerReviewCustomerDto(Guid Id, string FullName, string Email, string PhoneNumber);

/// <summary>A review in the owner's list (SCR-W39), every status.</summary>
public sealed record OwnerReviewDto(
    Guid Id,
    CatalogItemType ProductType,
    Guid ProductId,
    string ProductName,
    OwnerReviewCustomerDto Customer,
    int Rating,
    string? Comment,
    string? ImageUrl,
    ReviewStatus Status,
    string? OwnerReply,
    DateTime? RepliedAtUtc,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

/// <summary>A product the customer bought or experienced, with whether it can be reviewed now (<c>GET /me/reviewable</c>).</summary>
public sealed record ReviewableProductDto(
    CatalogItemType ProductType,
    Guid ProductId,
    string Name,
    string? ImageUrl,
    bool Eligible,
    ReviewIneligibility? Reason,
    Guid? ReviewId);
