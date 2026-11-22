namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>An installment order whose package expires soon with an installment unpaid (NTF-E17).</summary>
public sealed record InstallmentExpiryCandidate(Guid OrderId, Guid CustomerId, string PackageName, DateTime ExpiresAtUtc);
