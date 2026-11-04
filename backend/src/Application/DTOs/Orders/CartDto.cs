using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary><see cref="TotalAmount"/> sums the current price of available lines only.</summary>
public sealed record CartDto(IReadOnlyList<CartItemDto> Items, int ItemCount, decimal TotalAmount);

/// <summary><see cref="UnitPrice"/> is the reference price when added; the order uses <see cref="CurrentPrice"/> (BR-ORD-02).</summary>
public sealed record CartItemDto(
    Guid Id,
    CatalogItemType Type,
    Guid ProductId,
    string Name,
    string? ImageUrl,
    decimal UnitPrice,
    decimal CurrentPrice,
    bool PriceChanged,
    bool IsAvailable,
    DateTime AddedAtUtc);
