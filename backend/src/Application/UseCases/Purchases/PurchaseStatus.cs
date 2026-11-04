using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Purchases;

/// <summary>
/// BR-TRT-04: the status shown and used for booking. No job marks rows expired yet (Q-32), so an available entitlement or an
/// active package past its expiry reads as expired without being written back.
/// </summary>
public static class PurchaseStatus
{
    public static EntitlementStatus Effective(EntitlementStatus status, DateTime? expiresAtUtc, DateTime nowUtc) =>
        status == EntitlementStatus.Available && expiresAtUtc <= nowUtc ? EntitlementStatus.Expired : status;

    public static CustomerPackageStatus Effective(CustomerPackageStatus status, DateTime? expiresAtUtc, DateTime nowUtc) =>
        status == CustomerPackageStatus.Active && expiresAtUtc <= nowUtc ? CustomerPackageStatus.Expired : status;
}
