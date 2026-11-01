using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>
/// A customer's own appointment (<c>GET /me/appointments/{id}</c>, UC-SPA-15/16). Unlike the owner's detail it carries no customer
/// contact, allergies or skin profile. <see cref="Order"/> is set for book-now appointments.
/// </summary>
public sealed record MyAppointmentDto(
    Guid Id,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    AppointmentStatus Status,
    DateTime? HoldExpiresAtUtc,
    DateTime? CancelledAtUtc,
    string? CancellationReason,
    DateTime CreatedAtUtc,
    AppointmentServiceDto Service,
    AppointmentStaffDto Staff,
    AppointmentBookingSource Source,
    Guid? ServiceEntitlementId,
    MyTreatmentSessionRefDto? TreatmentSession,
    MyAppointmentOrderDto? Order)
{
    /// <summary>UC-SPA-16: the customer may still move the appointment (BR-BKG-07, BR-BKG-16); the command checks again.</summary>
    public bool CanReschedule { get; init; }

    /// <summary>UC-SPA-16: the customer may still cancel the appointment (BR-BKG-07).</summary>
    public bool CanCancel { get; init; }

    /// <summary>Visit start minus <c>Booking:CustomerChangeCutoffHours</c>; null when the status never allows a change.</summary>
    public DateTime? ChangeDeadlineAtUtc { get; init; }
}

/// <summary>A customer's appointment as read, with the facts its change flags are computed from.</summary>
public sealed record MyAppointmentRow(MyAppointmentDto Appointment, AppointmentChangeFacts Facts);

public sealed record MyTreatmentSessionRefDto(Guid Id, int SequenceNumber, Guid CustomerPackageId, string PackageName);

public sealed record MyAppointmentOrderDto(Guid Id, string Code, OrderStatus Status);
