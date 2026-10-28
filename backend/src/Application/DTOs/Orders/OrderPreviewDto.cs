using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>
/// What the order would be now. Unavailable cart lines are listed apart and left out of the totals; a code that does not apply
/// is reported in <see cref="PromotionError"/> and the totals are computed without it (UC-SPA-11 E1, E4).
/// </summary>
public sealed record OrderPreviewDto(
    IReadOnlyList<OrderPreviewItemDto> Items,
    IReadOnlyList<UnavailableItemDto> UnavailableItems,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal GrandTotal,
    AppliedPromotionDto? Promotion,
    PromotionErrorDto? PromotionError);

public sealed record OrderPreviewItemDto(
    CatalogItemType Type, Guid ProductId, string ProductName, decimal UnitPrice, decimal DiscountAmount, decimal LineTotal);

public sealed record UnavailableItemDto(CatalogItemType Type, Guid ProductId, string Name);

public sealed record AppliedPromotionDto(string Code, decimal DiscountAmount);

public sealed record PromotionErrorDto(string Code, string Message);
