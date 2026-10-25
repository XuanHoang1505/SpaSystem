namespace NhuNguyetSpa.Domain.Enums;

/// <summary>Stored as snake_case text: pending_payment, paid, cancelled, expired.</summary>
public enum OrderStatus
{
    PendingPayment,
    Paid,
    Cancelled,
    Expired,
}
