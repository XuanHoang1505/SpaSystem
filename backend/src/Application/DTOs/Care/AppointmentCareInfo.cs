using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Care;

/// <summary>What the care use cases check on an appointment: whose it is, its status and when it is (BR-CARE-01, 03, 04).</summary>
public sealed record AppointmentCareInfo(
    Guid Id, Guid CustomerId, Guid StaffMemberId, AppointmentStatus Status, DateOnly Date, TimeOnly StartTime);
