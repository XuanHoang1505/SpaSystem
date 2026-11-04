using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary><c>GET /appointments/{id}</c> and the result of every owner command (docs/specs/bookings.md).</summary>
public sealed record AppointmentDetailDto(
    Guid Id,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    AppointmentStatus Status,
    AppointmentCustomerDto Customer,
    AppointmentStaffDto Staff,
    AppointmentServiceDto Service,
    DateTime? HoldExpiresAtUtc,
    DateTime? CancelledAtUtc,
    string? CancellationReason,
    string? Note,
    DateTime CreatedAtUtc,
    IReadOnlyList<CustomerAllergyDto> Allergies,
    TreatmentSessionRefDto? TreatmentSession,
    bool HasSkinProfile,
    Guid? SkinProfileId);
