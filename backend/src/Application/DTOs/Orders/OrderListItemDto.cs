using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>A row of the owner's <c>GET /orders</c>; <see cref="LatestPaymentStatus"/> is that of the newest attempt, if any.</summary>
public sealed record OrderListItemDto(
    Guid Id,
    string Code,
    OrderStatus Status,
    DateTime CreatedAtUtc,
    DateTime PaymentDueAtUtc,
    decimal GrandTotal,
    int ItemCount,
    AppointmentCustomerDto Customer,
    int PaymentCount,
    PaymentStatus? LatestPaymentStatus,
    string? PromotionCode);
