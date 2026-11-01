using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Treatments;

public sealed record StaffRefDto(Guid Id, string FullName);

public sealed record TreatmentCustomerDto(Guid Id, string FullName, string? PhoneNumber);

/// <summary>The current appointment of a session: the latest one that is not cancelled or an expired hold (BR-TRT-10).</summary>
public sealed record SessionAppointmentDto(Guid Id, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, AppointmentStatus Status, StaffRefDto Staff);

/// <summary>Shown to the customer only when <c>Treatments:ShowSkinProfilesToCustomer</c> is on (Q-39).</summary>
public sealed record SkinProfileSummaryDto(SkinType SkinType, string? CareGoals, string? RecommendedTreatment);
