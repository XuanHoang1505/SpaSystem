using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>
/// What an installment shows: the stored status, or <c>Expired</c> for a pending one whose package can no longer be used
/// (computed on read, BR-INS-07).
/// </summary>
public enum InstallmentState
{
    Pending,
    Paid,
    Cancelled,
    Expired,
}

/// <summary>An installment of an installment order (docs/specs/order-installments.md).</summary>
public sealed record OrderInstallmentDto(
    Guid Id, int SequenceNumber, int FirstSessionNumber, int LastSessionNumber, decimal Amount, InstallmentState Status, DateTime? PaidAtUtc)
{
    public static InstallmentState StateOf(InstallmentStatus status) => status switch
    {
        InstallmentStatus.Paid => InstallmentState.Paid,
        InstallmentStatus.Cancelled => InstallmentState.Cancelled,
        _ => InstallmentState.Pending,
    };
}

/// <summary>The installment the next payment is for (BR-INS-05).</summary>
public sealed record NextInstallmentDto(Guid Id, int SequenceNumber, decimal Amount, int FirstSessionNumber, int LastSessionNumber);

/// <summary>
/// What payability of an installment order depends on (BR-INS-05, 07): the next installment, its attempts so far, and whether the
/// package it unlocks is still usable.
/// </summary>
public sealed record InstallmentFacts(
    int? NextSequenceNumber,
    int NextAttemptCount,
    CustomerPackageStatus? PackageStatus,
    DateTime? PackageExpiresAtUtc,
    TreatmentPlanStatus? PlanStatus);
