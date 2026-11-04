using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Promotions;

/// <summary><see cref="UsedCount"/> counts paid orders only (pending orders still hold a use, BR-PRM-01, but are not shown as used).</summary>
public sealed record PromotionDto(
    Guid Id,
    string Code,
    string? Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    decimal MinOrderAmount,
    decimal? MaxDiscountAmount,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc,
    int? PerCustomerLimit,
    int? UsageLimit,
    PromotionStatus Status,
    int UsedCount);
