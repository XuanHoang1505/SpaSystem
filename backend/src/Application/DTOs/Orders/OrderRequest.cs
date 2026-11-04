namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>
/// Body of <c>POST /me/orders/preview</c> and <c>POST /me/orders</c>: the whole cart, or one product bought now (exactly one id).
/// Prices always come from the catalog (BR-ORD-02).
/// </summary>
public sealed record OrderRequest(OrderSource? Source, Guid? SpaServiceId, Guid? ServicePackageId, string? PromotionCode);
