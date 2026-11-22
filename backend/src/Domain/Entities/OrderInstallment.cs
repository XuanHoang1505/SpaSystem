using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>
/// Table <c>order_installments</c> (proposed; not in the thesis ERD). One installment of an installment order: paying it unlocks
/// sessions <see cref="FirstSessionNumber"/>..<see cref="LastSessionNumber"/> of the package (BR-INS-02, 06). Amount and
/// session range are fixed when the order is created (BR-INS-04). See docs/specs/order-installments.md.
/// </summary>
public sealed class OrderInstallment : BaseEntity
{
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public int SequenceNumber { get; set; }
    public int FirstSessionNumber { get; set; }
    public int LastSessionNumber { get; set; }
    public decimal Amount { get; set; }
    public InstallmentStatus Status { get; set; }
    public DateTime? PaidAtUtc { get; set; }

    public void MarkPaid(DateTime paidAtUtc)
    {
        if (Status != InstallmentStatus.Pending)
            throw new InvalidOperationException($"Installment {SequenceNumber} cannot be paid in status {Status}.");
        Status = InstallmentStatus.Paid;
        PaidAtUtc = paidAtUtc;
    }

    /// <summary>Order cancelled before paying, or treatment plan cancelled by the owner (BR-INS-11). Paid ones stay paid.</summary>
    public void Cancel()
    {
        if (Status == InstallmentStatus.Pending)
            Status = InstallmentStatus.Cancelled;
    }

    /// <summary>Re-splits the sessions when the package changed before the first payment (BR-INS-04); the amount stays.</summary>
    public void MoveSessions(int firstSessionNumber, int lastSessionNumber)
    {
        FirstSessionNumber = firstSessionNumber;
        LastSessionNumber = lastSessionNumber;
    }
}
