using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>
/// The owner's <c>GET /orders/{id}</c>: the customer's order detail plus the customer and the gateway references of each attempt.
/// <see cref="CanCancel"/> follows BR-ORD-04 only (Q-44 never blocks the owner).
/// </summary>
public sealed record OwnerOrderDetailDto(
    Guid Id,
    string Code,
    OrderStatus Status,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal GrandTotal,
    DateTime PaymentDueAtUtc,
    DateTime CreatedAtUtc,
    bool IsPayable,
    bool CanCancel,
    DateTime? CancelledAtUtc,
    string? CancellationReason,
    OrderCustomerDto Customer,
    IReadOnlyList<OrderItemDto> Items,
    IReadOnlyList<OwnerOrderPaymentDto> Payments,
    AppliedPromotionDto? Promotion,
    OrderAppointmentDto? Appointment);

public sealed record OrderCustomerDto(Guid Id, string FullName, string PhoneNumber, string Email);

public sealed record OwnerOrderPaymentDto(
    Guid Id,
    string Provider,
    decimal Amount,
    PaymentStatus Status,
    string RequestCode,
    string? ProviderTransactionId,
    DateTime CreatedAtUtc,
    DateTime ExpiresAtUtc,
    DateTime? PaidAtUtc);
