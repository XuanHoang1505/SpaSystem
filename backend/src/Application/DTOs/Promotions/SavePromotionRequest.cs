using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Promotions;

/// <summary>Body of <c>POST /promotions</c> and <c>PUT /promotions/{id}</c> (UC-SPA-14). Nullable so missing fields get a validation message.</summary>
public sealed record SavePromotionRequest(
    string? Code,
    string? Description,
    DiscountType? DiscountType,
    decimal? DiscountValue,
    decimal? MinOrderAmount,
    decimal? MaxDiscountAmount,
    DateTime? StartsAtUtc,
    DateTime? EndsAtUtc,
    int? PerCustomerLimit,
    int? UsageLimit);
