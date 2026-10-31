using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Care;

/// <summary>A skin profile of one visit (UC-SPA-27).</summary>
public sealed record SkinProfileDto(
    Guid Id,
    Guid AppointmentId,
    Guid CustomerId,
    AppointmentStaffDto AssessedBy,
    DateTime AssessedAtUtc,
    SkinType SkinType,
    string? MainConcerns,
    string? CurrentProducts,
    string? CareGoals,
    string? RecommendedTreatment,
    string? Note,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);
