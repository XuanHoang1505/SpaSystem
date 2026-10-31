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
    MyAppointmentOrderDto? Order);

public sealed record MyTreatmentSessionRefDto(Guid Id, int SequenceNumber, Guid CustomerPackageId, string PackageName);

public sealed record MyAppointmentOrderDto(Guid Id, string Code, OrderStatus Status);
