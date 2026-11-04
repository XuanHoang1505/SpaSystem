using NhuNguyetSpa.Application.DTOs.Orders;

namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary><see cref="Created"/> is false when an <c>Idempotency-Key</c> matched an earlier book-now order (BR-ORD-08).</summary>
public sealed record BookNowResult(MyAppointmentDto Appointment, OrderDetailDto Order, bool Created);
