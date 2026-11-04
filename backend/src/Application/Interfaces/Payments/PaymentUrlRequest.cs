using NhuNguyetSpa.Application.DTOs.Orders;

namespace NhuNguyetSpa.Application.Interfaces.Payments;

public sealed record PaymentUrlRequest(
    string RequestCode,
    decimal Amount,
    string OrderCode,
    DateTime CreatedAtUtc,
    DateTime ExpiresAtUtc,
    string ClientIp,
    PaymentClient Client);
