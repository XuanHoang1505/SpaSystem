using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Purchases;

/// <summary>
/// How a package bought in installments is paid (docs/specs/order-installments.md): sessions 1..<see cref="PaidSessionCount"/> are
/// paid and bookable (BR-INS-06); <see cref="NextInstallment"/> unlocks the next ones. Null on packages paid in full.
/// </summary>
public sealed record PackagePaymentDto(PaymentPlan Plan, int PaidSessionCount, int TotalSessions, PackageNextInstallmentDto? NextInstallment);

/// <summary>Pay it with <c>POST /me/orders/{OrderId}/payments</c>.</summary>
public sealed record PackageNextInstallmentDto(Guid OrderId, int SequenceNumber, decimal Amount, int FirstSessionNumber, int LastSessionNumber);
