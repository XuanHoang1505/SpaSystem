using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>An occupying appointment on or after the resignation date; the owner reassigns it (UC-SPA-17).</summary>
public sealed record AppointmentToReassignDto(
    Guid Id,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    AppointmentStatus Status,
    Guid CustomerId,
    string CustomerName);
