using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>A row of <c>GET /me/orders</c>; <see cref="IsPayable"/> and <see cref="CanCancel"/> as in the order detail.</summary>
public sealed record MyOrderListItemDto(
    Guid Id,
    string Code,
    OrderStatus Status,
    DateTime CreatedAtUtc,
    DateTime PaymentDueAtUtc,
    decimal GrandTotal,
    int ItemCount,
    IReadOnlyList<string> ProductNames,
    bool IsPayable,
    bool CanCancel);
