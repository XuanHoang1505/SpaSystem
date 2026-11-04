using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Purchases;

/// <summary>Error codes of UC-SPA-18 (docs/specs/purchases-treatments.md); a missing bought service reuses <c>BookingErrors.EntitlementNotFound</c>.</summary>
public static class PurchaseErrors
{
    public const string CustomerPackageNotFoundCode = "customer_package_not_found";

    public static NotFoundException CustomerPackageNotFound() => new("Không tìm thấy gói đã mua.", CustomerPackageNotFoundCode);
}
