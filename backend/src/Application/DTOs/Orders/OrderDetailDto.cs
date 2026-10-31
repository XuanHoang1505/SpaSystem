using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>
/// <see cref="IsPayable"/>: still pending, before the due time, and below the attempt limit (a new payment can be started).
/// <see cref="Appointment"/>: the slot held by a book-now order (UC-SPA-15).
/// </summary>
public sealed record OrderDetailDto(
    Guid Id,
    string Code,
    OrderStatus Status,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal GrandTotal,
    DateTime PaymentDueAtUtc,
    DateTime CreatedAtUtc,
    bool IsPayable,
    IReadOnlyList<OrderItemDto> Items,
    IReadOnlyList<OrderPaymentDto> Payments,
    AppliedPromotionDto? Promotion,
    OrderAppointmentDto? Appointment = null);

public sealed record OrderItemDto(
    Guid Id, CatalogItemType Type, Guid ProductId, string ProductName, decimal UnitPrice, decimal DiscountAmount, decimal LineTotal);

public sealed record OrderPaymentDto(Guid Id, string Provider, decimal Amount, PaymentStatus Status, DateTime CreatedAtUtc, DateTime? PaidAtUtc);

/// <summary><see cref="Created"/> is false when an <c>Idempotency-Key</c> matched an earlier order (BR-ORD-08).</summary>
public sealed record CreatedOrder(OrderDetailDto Order, bool Created);
