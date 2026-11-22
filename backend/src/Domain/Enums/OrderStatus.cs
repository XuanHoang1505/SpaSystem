namespace NhuNguyetSpa.Domain.Enums;

/// <summary>
/// Stored as snake_case text: pending_payment, partially_paid, paid, cancelled, expired. <c>PartiallyPaid</c>: an installment
/// order whose first installment is paid (Q-86).
/// </summary>
public enum OrderStatus
{
    PendingPayment,
    PartiallyPaid,
    Paid,
    Cancelled,
    Expired,
}
