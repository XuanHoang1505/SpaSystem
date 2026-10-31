using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>customer_packages</c> (thesis: GoiKhachHang). See docs/domain/data-model.md.</summary>
public sealed class CustomerPackage : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public Guid OrderItemId { get; set; }
    public OrderItem OrderItem { get; set; } = null!;
    public string PackageName { get; set; } = string.Empty;
    public DateTime PurchasedAtUtc { get; set; }
    public DateTime? ActivatedAtUtc { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public int TotalSessions { get; set; }
    public int UsedSessions { get; set; }
    public CustomerPackageStatus Status { get; set; }

    /// <summary>
    /// BR-TRT-03: one more session completed; the package completes when every session is used. An expired package still
    /// counts the session (it was booked while valid). Returns true when this call completed the package.
    /// </summary>
    public bool RecordCompletedSession()
    {
        if (Status is CustomerPackageStatus.Cancelled or CustomerPackageStatus.Completed)
            throw new InvalidOperationException($"Customer package in status {Status} cannot record a completed session.");
        if (UsedSessions >= TotalSessions)
            throw new InvalidOperationException("Every session of the package is already used.");
        UsedSessions++;
        if (UsedSessions < TotalSessions)
            return false;
        Status = CustomerPackageStatus.Completed;
        return true;
    }
}
