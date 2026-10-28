using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>
/// A cart row joined with its product as it is today: <see cref="CurrentPrice"/> is the catalog price and
/// <see cref="IsAvailable"/> applies BR-CAT-01 for the given day. Used by the cart view and by order pricing.
/// </summary>
public sealed record CartLine(
    Guid ItemId,
    CatalogItemType Type,
    Guid ProductId,
    string Name,
    string? ImageUrl,
    decimal UnitPrice,
    decimal CurrentPrice,
    bool IsAvailable,
    DateTime AddedAtUtc);
