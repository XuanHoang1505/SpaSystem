namespace NhuNguyetSpa.Domain.Enums;

/// <summary>Stored as snake_case text: held, pending_confirmation, confirmed, completed, cancelled, no_show, hold_expired.</summary>
public enum AppointmentStatus
{
    Held,
    PendingConfirmation,
    Confirmed,
    Completed,
    Cancelled,
    NoShow,
    HoldExpired,
}
