using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Promotions;

public enum PromotionSortField
{
    StartsAtUtc,
    Code,
}

/// <summary>Repository input: promotions whose <c>[starts, ends)</c> overlaps <c>[FromUtc, ToUtcExclusive)</c> when given.</summary>
public sealed record PromotionSearchCriteria(
    string? Search,
    PromotionStatus? Status,
    DateTime? FromUtc,
    DateTime? ToUtcExclusive,
    PromotionSortField SortBy,
    SortDirection SortDirection,
    int PageNumber,
    int PageSize);
