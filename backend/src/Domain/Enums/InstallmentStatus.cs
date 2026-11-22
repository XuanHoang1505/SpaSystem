namespace NhuNguyetSpa.Domain.Enums;

/// <summary>Stored as snake_case text: pending, paid, cancelled. "Expired" is only computed on read (BR-INS-07).</summary>
public enum InstallmentStatus
{
    Pending,
    Paid,
    Cancelled,
}
